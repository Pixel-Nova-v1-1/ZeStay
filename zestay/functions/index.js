// Force redeploy to apply new API key
const { onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");



// API keys from .env
const primaryKey = defineString("GEMINI_API_KEY");
const backupKey = defineString("GEMINI_BACKUP_API_KEY");

// Lazy-initialized Gemini clients
let primaryGenAI;
let backupGenAI;
let useBackup = false;

let GoogleGenerativeAI;
function getGenAI() {
    if (!GoogleGenerativeAI) {
        GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
    }
    if (!useBackup) {
        if (!primaryGenAI) primaryGenAI = new GoogleGenerativeAI(primaryKey.value());
        return primaryGenAI;
    }
    if (!backupGenAI) backupGenAI = new GoogleGenerativeAI(backupKey.value());
    return backupGenAI;
}

function getModel(systemInstruction) {
    const genAI = getGenAI();
    const config = { model: "gemini-flash-latest" };
    if (systemInstruction) config.systemInstruction = systemInstruction;
    return genAI.getGenerativeModel(config);
}

// ── Rate limiter (10 req/min per IP, per instance) ──
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQ = 10;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.start > WINDOW_MS) {
        rateLimitMap.set(ip, { start: now, count: 1 });
        return false;
    }
    return ++entry.count > MAX_REQ;
}

// Clean stale entries lazily on requests instead of parsing block timeout.
// (Global setInterval causes Firebase deploy to hang)

exports.chatBot = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const clientIp = req.headers["x-forwarded-for"] || req.ip || "unknown";
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ success: false, error: "Too many requests. Please wait a minute." });
    }

    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
        return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    try {
        const model = getModel(systemInstruction);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // If we get a successful response on primary, reset backup flag
        useBackup = false;
        res.json({ success: true, response: text });
    } catch (error) {
        // If quota/rate error on primary, auto-switch to backup and retry once
        if (!useBackup && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("Resource has been exhausted"))) {
            console.warn("Primary key exhausted, switching to backup key...");
            useBackup = true;
            try {
                const model = getModel(systemInstruction);
                const result = await model.generateContent(prompt);
                const text = result.response.text();
                res.json({ success: true, response: text });
                return;
            } catch (backupError) {
                console.error("Backup key also failed:", backupError);
                return res.status(500).json({ success: false, error: "Both API keys exhausted. Please try later." });
            }
        }
        console.error("Gemini error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
