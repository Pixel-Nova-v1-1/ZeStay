import "./theme.js";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('veriDetailsForm');
    let currentUser = null;
    let capturedSelfieBase64 = null;

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showToast("You must be logged in.", "warning");
            window.location.href = 'regimob.html?mode=login';
            return;
        }

        currentUser = user;

        // Check if phone number is linked
        if (!user.phoneNumber) {
            showToast("Please complete phone verification first.", "warning");
            window.location.href = 'phone_verify.html?flow=verification';
            return;
        }

        // Check if already verified
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isVerified) {
                showToast("You are already verified!", "info");
                window.location.href = 'index.html';
                return;
            }
        }

        // Pre-fill fields
        const nameInput = document.getElementById('vd-name');
        const emailInput = document.getElementById('vd-email');
        const mobileInput = document.getElementById('vd-mobile');

        if (emailInput) emailInput.value = user.email || '';
        if (mobileInput) mobileInput.value = user.phoneNumber || '';

        // Pre-fill name from user doc if available
        if (userDoc.exists() && userDoc.data().name) {
            nameInput.value = userDoc.data().name;
        }
    });

    // ===== File Upload Handling =====
    const setupFileUpload = (dropZoneId, inputId) => {
        const dropZone = document.getElementById(dropZoneId);
        const input = document.getElementById(inputId);
        if (!dropZone || !input) return;

        const preview = dropZone.querySelector('.file-preview');
        const placeholder = dropZone.querySelector('.upload-placeholder');

        dropZone.addEventListener('click', () => input.click());

        input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
                handleFile(input.files[0], preview, placeholder, input);
            }
        });

        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '#00C4B4', false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '', false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files[0]) {
                input.files = files;
                handleFile(files[0], preview, placeholder, input);
            }
        });
    };

    const handleFile = (file, preview, placeholder, input) => {
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

            preview.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                input.value = '';
                preview.innerHTML = '';
                placeholder.style.display = 'block';
            });
        };
        reader.readAsDataURL(file);
    };

    setupFileUpload('drop-zone-front', 'id-front');
    setupFileUpload('drop-zone-back', 'id-back');

    // ===== Live Selfie Logic =====
    let stream = null;
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
            captureBtn.style.display = 'inline-flex';
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
        retakeBtn.style.display = 'inline-flex';

        stopCamera();
    };

    const retakeImage = () => {
        capturedSelfieBase64 = null;
        startCamera();
    };

    if (startCameraBtn) startCameraBtn.addEventListener('click', startCamera);
    if (captureBtn) captureBtn.addEventListener('click', captureImage);
    if (retakeBtn) retakeBtn.addEventListener('click', retakeImage);

    // ===== Image Compression =====
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
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // ===== Form Submission =====
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("You must be logged in.", "warning");
                return;
            }

            // Validation
            const idFront = document.getElementById('id-front').files[0];
            const idBack = document.getElementById('id-back').files[0];

            if (!idFront || !idBack) {
                showToast('Please upload both sides of your ID card.', "warning");
                return;
            }

            if (!capturedSelfieBase64) {
                showToast('Please take a live selfie.', "warning");
                return;
            }

            const btnSubmit = form.querySelector('.btn-submit-veri');
            const originalHTML = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            btnSubmit.disabled = true;

            try {
                // Check for existing verified status
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists() && userDoc.data().isVerified) {
                    showToast("You are already verified!", "info");
                    window.location.href = 'index.html';
                    return;
                }

                // Delete any old verification requests (revoked or otherwise)
                const oldRequestsQuery = query(
                    collection(db, "verification_requests"),
                    where("userId", "==", currentUser.uid)
                );
                const oldRequests = await getDocs(oldRequestsQuery);
                const deletePromises = oldRequests.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deletePromises);

                // Compress images
                const idFrontBase64 = await compressImage(idFront);
                const idBackBase64 = await compressImage(idBack);

                // Create verification request with 'verified' status (instant approval)
                await addDoc(collection(db, "verification_requests"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    name: document.getElementById('vd-name').value.trim(),
                    mobile: currentUser.phoneNumber || document.getElementById('vd-mobile').value,
                    email: document.getElementById('vd-email').value,
                    idFrontUrl: idFrontBase64,
                    idBackUrl: idBackBase64,
                    selfieUrl: capturedSelfieBase64,
                    status: 'verified',
                    adminStatus: 'pending_review',
                    submittedAt: serverTimestamp()
                });

                // Instantly verify the user
                await updateDoc(doc(db, "users", currentUser.uid), {
                    isVerified: true
                });

                // Send notification
                await addDoc(collection(db, "notifications"), {
                    userId: currentUser.uid,
                    title: "Verification Complete",
                    message: "Congratulations! You are now verified and can create listings. An admin may review your details.",
                    type: "success",
                    read: false,
                    timestamp: new Date()
                });

                stopCamera();

                showToast('You are now verified! You can start creating listings.', "success");

                setTimeout(() => {
                    window.location.href = 'why.html';
                }, 1500);

            } catch (error) {
                console.error("Error submitting verification:", error);
                showToast("Error submitting verification: " + error.message, "error");
            } finally {
                btnSubmit.innerHTML = originalHTML;
                btnSubmit.disabled = false;
            }
        });
    }
});
