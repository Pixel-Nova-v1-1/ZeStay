import { auth, db, storage } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showToast } from "./toast.js";

document.addEventListener('DOMContentLoaded', () => {
    // Modal Elements
    const modal = document.getElementById('verificationModal');
    const btnVerify = document.querySelector('.btn-verify');
    const btnClose = document.querySelector('.modal-close-btn');
    const form = document.getElementById('verificationForm');
    let currentUser = null;

    // Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            // Pre-fill email if available
            const emailInput = document.getElementById('v-email');
            if (emailInput) emailInput.value = user.email;
        }
    });

    // Open Modal
    if (btnVerify) {
        btnVerify.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast("Please log in to request verification.", "warning");
                window.location.href = 'index.html';
                return;
            }

            // Check for existing pending or approved requests
            try {
                const q = query(collection(db, "verification_requests"), where("userId", "==", currentUser.uid));
                const querySnapshot = await getDocs(q);
                let hasPending = false;
                let isVerified = false;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.status === 'pending') hasPending = true;
                    if (data.status === 'approved') isVerified = true;
                });

                if (isVerified) {
                    alert("You are already verified! You don't need to submit another request.");
                    return;
                }

                if (hasPending) {
                    alert("You already have a pending verification request. Please wait for the admin to review it.");
                    return;
                }

                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling

            } catch (error) {
                console.error("Error checking verification status:", error);
                alert("Error checking status. Please try again.");
            }
        });
    }

    // Close Modal Function
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // File Upload Handling
    const setupFileUpload = (dropZoneId, inputId) => {
        const dropZone = document.getElementById(dropZoneId);
        const input = document.getElementById(inputId);
        const preview = dropZone.querySelector('.file-preview');
        const placeholder = dropZone.querySelector('.upload-placeholder');

        if (!dropZone || !input) return;

        // Click to trigger input
        dropZone.addEventListener('click', () => input.click());

        // Handle file selection
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                handleFile(file, preview, placeholder, input);
            }
        });

        // Drag and Drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '#00C4B4', false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '', false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                input.files = files; // Update input files
                handleFile(files[0], preview, placeholder, input);
            }
        });
    };

    const handleFile = (file, preview, placeholder, input) => {
        // Validate type
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file (JPG, PNG).', "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-file-btn" title="Remove image">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            placeholder.style.display = 'none';

            // Remove functionality
            preview.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Stop click from triggering input
                input.value = ''; // Clear file input
                preview.innerHTML = ''; // Clear preview
                placeholder.style.display = 'block'; // Show placeholder
            });
        };
        reader.readAsDataURL(file);
    };

    // Setup Uploads
    setupFileUpload('drop-zone-front', 'id-front');
    setupFileUpload('drop-zone-back', 'id-back');
    // setupFileUpload('drop-zone-selfie', 'selfie'); // Removed for live selfie

    // --- Live Selfie Logic ---
    let stream = null;
    let capturedSelfieBase64 = null;
    const webcamElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    const capturedImageElement = document.getElementById('captured-image');
    const startCameraBtn = document.getElementById('start-camera');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');

    const startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamElement.srcObject = stream;
            webcamElement.style.display = 'block';
            capturedImageElement.style.display = 'none';
            startCameraBtn.style.display = 'none';
            captureBtn.style.display = 'inline-block';
            retakeBtn.style.display = 'none';
        } catch (err) {
            console.error("Error accessing webcam:", err);
            showToast("Could not access camera. Please allow camera permissions.", "error");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    };

    const captureImage = () => {
        if (!stream) return;

        const context = canvasElement.getContext('2d');
        canvasElement.width = webcamElement.videoWidth;
        canvasElement.height = webcamElement.videoHeight;
        context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);

        capturedSelfieBase64 = canvasElement.toDataURL('image/jpeg', 0.8);
        capturedImageElement.src = capturedSelfieBase64;

        webcamElement.style.display = 'none';
        capturedImageElement.style.display = 'block';
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-block';

        // Stop camera stream after capture to save resources
        stopCamera();
    };

    const retakeImage = () => {
        capturedSelfieBase64 = null;
        startCamera();
    };

    if (startCameraBtn) startCameraBtn.addEventListener('click', startCamera);
    if (captureBtn) captureBtn.addEventListener('click', captureImage);
    if (retakeBtn) retakeBtn.addEventListener('click', retakeImage);

    // Ensure camera stops when modal is closed
    if (btnClose) {
        btnClose.addEventListener('click', stopCamera);
    }
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            stopCamera();
        }
    });

    // Helper to compress image and convert to Base64
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 0.8 quality for better clarity
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("You must be logged in.", "warning");
                return;
            }

            // 1. Validation: Check if files are selected
            const idFront = document.getElementById('id-front').files[0];
            const idBack = document.getElementById('id-back').files[0];

            if (!idFront || !idBack) {
                showToast('Please upload ID card images.', "warning");
                return;
            }

            if (!capturedSelfieBase64) {
                showToast('Please take a live selfie.', "warning");
                return;
            }

            const btnSubmit = form.querySelector('.btn-submit');
            const originalText = btnSubmit.textContent;
            btnSubmit.textContent = 'Processing...';
            btnSubmit.disabled = true;

            try {
                // Check for existing pending or approved requests to prevent duplication
                const q = query(collection(db, "verification_requests"), where("userId", "==", currentUser.uid));
                const querySnapshot = await getDocs(q);
                let hasPending = false;
                let isVerified = false;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.status === 'pending') hasPending = true;
                    if (data.status === 'approved') isVerified = true;
                });

                if (isVerified) {
                    showToast("You are already verified!", "warning");
                    btnSubmit.textContent = originalText;
                    btnSubmit.disabled = false;
                    return;
                }

                if (hasPending) {
                    showToast("You already have a pending verification request.", "warning");
                    btnSubmit.textContent = originalText;
                    btnSubmit.disabled = false;
                    return;
                }

                // 2. Compress Images to Base64 (Bypasses CORS and Storage buckets)
                const idFrontBase64 = await compressImage(idFront);
                const idBackBase64 = await compressImage(idBack);
                // Selfie is already Base64

                // 3. Save Request to Firestore
                await addDoc(collection(db, "verification_requests"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    name: document.getElementById('v-name').value,
                    mobile: document.getElementById('v-mobile').value,
                    email: document.getElementById('v-email').value,
                    idFrontUrl: idFrontBase64,
                    idBackUrl: idBackBase64,
                    selfieUrl: capturedSelfieBase64,
                    status: 'pending',
                    submittedAt: serverTimestamp()
                });

                showToast('Verification request submitted successfully! An admin will review your details.', "success");
                closeModal();
                form.reset();
                // Reset file previews
                document.querySelectorAll('.file-preview').forEach(el => el.innerHTML = '');
                document.querySelectorAll('.upload-placeholder').forEach(el => el.style.display = 'block');

            } catch (error) {
                console.error("Error submitting verification:", error);
                showToast("Error submitting verification request: " + error.message, "error");
            } finally {
                btnSubmit.textContent = originalText;
                btnSubmit.disabled = false;
            }
        });
    }
});
