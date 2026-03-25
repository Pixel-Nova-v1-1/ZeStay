// Shared Firebase Storage upload/delete utilities
import { storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { compressImage, validateImage, formatSize } from "./imageCompressor.js";

/**
 * Upload a file to Firebase Storage.
 * @param {File|Blob} file - The file to upload
 * @param {string} path - Storage path (e.g. "avatars/userId/filename.jpg")
 * @returns {Promise<{url: string, storagePath: string}>}
 */
export async function uploadToFirebase(file, path) {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, storagePath: path };
}

/**
 * Validate, compress, and upload an image to Firebase Storage.
 * This is the recommended high-level function for all image uploads.
 * 
 * @param {File} file - The original image file
 * @param {string} path - Firebase Storage path
 * @returns {Promise<{url: string, storagePath: string, originalSize: number, compressedSize: number}>}
 */
export async function compressAndUpload(file, path) {
    // 1. Validate
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // 2. Compress
    const compressed = await compressImage(file);
    console.log(`Compression: ${formatSize(compressed.originalSize)} → ${formatSize(compressed.compressedSize)}`);

    // Revoke preview URL to free memory (caller should create their own if needed)
    if (compressed.previewUrl) {
        URL.revokeObjectURL(compressed.previewUrl);
    }

    // 3. Upload compressed blob
    // Use .webp extension in path for compressed images
    const webpPath = path.replace(/\.[^.]+$/, '') + '.webp';
    const result = await uploadToFirebase(compressed.blob, webpPath);

    return {
        ...result,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize
    };
}

/**
 * Delete a file from Firebase Storage by its storage path.
 * Silently ignores errors (e.g. file already deleted).
 * @param {string} path - The storage path used during upload
 */
export async function deleteFromFirebase(path) {
    if (!path) return;
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        console.log("Deleted from Firebase Storage:", path);
    } catch (error) {
        // Ignore "object-not-found" — file was already deleted or never existed
        if (error.code === 'storage/object-not-found') {
            console.log("File already deleted or not found:", path);
        } else {
            console.error("Error deleting from Firebase Storage:", error);
        }
    }
}

/**
 * Generate a unique storage path for an image.
 * @param {string} folder - Base folder (e.g. "avatars", "listings")
 * @param {string} userId - User's UID
 * @param {string} [fileName] - Optional custom filename; defaults to timestamped original name
 * @returns {string}
 */
export function getStoragePath(folder, userId, fileName) {
    const uniqueName = fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return `${folder}/${userId}/${uniqueName}`;
}

// Re-export for convenience
export { validateImage, compressImage, formatSize } from "./imageCompressor.js";
