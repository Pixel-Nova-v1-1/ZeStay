/**
 * Client-side image compression using Canvas API.
 * Converts images to WebP format with automatic quality adjustment.
 * No external libraries required.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const TARGET_SIZE = 900 * 1024;          // 900 KB target (under 1 MB)
const MAX_DIMENSION = 1920;              // Max width/height to resize to

/**
 * Validate that a file is an image and within the max size limit.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImage(file) {
    if (!file) return { valid: false, error: "No file selected." };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: "Invalid file type. Please select a JPG, PNG, or WebP image." };
    }

    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `File is too large (${sizeMB} MB). Maximum allowed size is 10 MB.` };
    }

    return { valid: true };
}

/**
 * Load a File into an HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image."));
        };
        img.src = url;
    });
}

/**
 * Compress an image using Canvas API → WebP.
 * Automatically scales down and adjusts quality to hit target size.
 * 
 * @param {File} file - The original image file
 * @returns {Promise<{ blob: Blob, originalSize: number, compressedSize: number, previewUrl: string }>}
 */
export async function compressImage(file) {
    const originalSize = file.size;

    // If file is already small enough (under 500 KB), minimal compression
    if (originalSize <= 500 * 1024) {
        const previewUrl = URL.createObjectURL(file);
        return {
            blob: file,
            originalSize,
            compressedSize: originalSize,
            previewUrl,
            skipped: true
        };
    }

    const img = await loadImage(file);
    let { width, height } = img;

    // Scale down if larger than MAX_DIMENSION
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Iterative quality adjustment to hit target size
    let quality = 0.82;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);

    // If still too large, reduce quality iteratively
    let attempts = 0;
    while (blob.size > TARGET_SIZE && quality > 0.1 && attempts < 8) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, 'image/webp', quality);
        attempts++;
    }

    // If still too large after quality reduction, scale down further
    if (blob.size > TARGET_SIZE) {
        let scale = 0.75;
        while (blob.size > TARGET_SIZE && scale > 0.3) {
            const newW = Math.round(width * scale);
            const newH = Math.round(height * scale);
            canvas.width = newW;
            canvas.height = newH;
            ctx.drawImage(img, 0, 0, newW, newH);
            blob = await canvasToBlob(canvas, 'image/webp', Math.max(quality, 0.5));
            scale -= 0.15;
        }
    }

    const previewUrl = URL.createObjectURL(blob);

    console.log(`Image compressed: ${formatSize(originalSize)} → ${formatSize(blob.size)} (quality: ${quality.toFixed(2)})`);

    return {
        blob,
        originalSize,
        compressedSize: blob.size,
        previewUrl,
        skipped: false
    };
}

/**
 * Convert canvas to Blob (promisified).
 */
function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas compression failed."));
            },
            type,
            quality
        );
    });
}

/**
 * Format bytes into human-readable size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
