import { auth, db } from "../firebase.js"; // NOTICE: No 'storage' import
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('profilePic');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const form = document.getElementById('registerForm');
    const submitBtn = form.querySelector('button[type="submit"]');

    let selectedAvatar = null;
    let storedBase64Image = null; // We will store the image text here
    let currentUser = null;

    // --- 0. AUTH CHECK ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            const emailField = form.querySelector('[name="email"]');
            if (emailField) emailField.value = user.email;
        } else {
            window.location.replace("/landing.html");
        }
    });

    // --- 1. HELPER: COMPRESS IMAGE TO TEXT (BASE64) ---
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Resize to max 500px width (plenty for profile pic)
                    const MAX_WIDTH = 500;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG at 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    // --- 2. UI LOGIC ---
    const updateUploadUI = (fileName) => {
        const uploadContent = dropZone.querySelector('.upload-content');
        if (fileName) {
            uploadContent.innerHTML = `
                <div class="selected-file-preview" style="display:flex; align-items:center; gap:10px; justify-content:center;">
                    <i class="fa-regular fa-image" style="color:#6C63FF;"></i>
                    <span class="file-name" style="font-weight:500;">${fileName}</span>
                    <i class="fa-solid fa-xmark remove-file" style="margin-left:10px;"></i>
                </div>
            `;
            dropZone.classList.add('has-file');
        } else {
            uploadContent.innerHTML = `
                <i class="fa-regular fa-image upload-icon"></i>
                <p>Click or drop to upload your profile photo (jpg or png)</p>
            `;
            dropZone.classList.remove('has-file');
        }
    };

    dropZone.addEventListener('click', (e) => {
        if (e.target.closest('.remove-file')) {
            e.preventDefault(); e.stopPropagation();
            storedBase64Image = null;
            fileInput.value = '';
            updateUploadUI(null);
            return;
        }
        if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image.');
                return;
            }
            
            // Clear avatar selection
            clearAvatarSelection();

            // Process the file immediately
            try {
                storedBase64Image = await compressImage(file);
                updateUploadUI(file.name);
                console.log("Image ready to save.");
            } catch (err) {
                console.error("Compression error", err);
                alert("Error reading file.");
            }
        }
    });

    avatarOptions.forEach(avatar => {
        avatar.addEventListener('click', function() {
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                selectedAvatar = null;
            } else {
                storedBase64Image = null;
                fileInput.value = '';
                updateUploadUI(null);

                clearAvatarSelection();
                this.classList.add('selected');
                selectedAvatar = this.getAttribute('data-value');
            }
        });
    });

    function clearAvatarSelection() {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        selectedAvatar = null;
    }

    // --- 3. SUBMIT LOGIC ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const name = form.querySelector('[name="name"]').value;
        const dob = form.querySelector('[name="dob"]').value;
        const gender = form.querySelector('[name="gender"]').value;
        const occupation = form.querySelector('[name="occupation"]').value;
        const hobbies = form.querySelector('[name="hobbies"]').value;

        if (!name || !dob || !gender) {
            alert("Please fill in required fields.");
            return;
        }

        if (!storedBase64Image && !selectedAvatar) {
            alert("Please choose a photo or avatar.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";

        try {
            let finalPhoto = "";

            // A. User Uploaded File (Use the text string we created earlier)
            if (storedBase64Image) {
                finalPhoto = storedBase64Image;
            } 
            // B. User Selected Avatar (Use the URL)
            else if (selectedAvatar) {
                finalPhoto = `https://api.dicebear.com/9.x/avataaars/svg?seed=${selectedAvatar}`;
            }

            // C. Save to Firestore (Database Only)
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                name: name,
                dob: dob,
                gender: gender,
                occupation: occupation || "",
                hobbies: hobbies || "",
                photoURL: finalPhoto, // Saves image as text!
                profileCompleted: true,
                updatedAt: serverTimestamp()
            });

            console.log("Success!");
            window.location.replace("/preference.html");

        } catch (error) {
            console.error("Error:", error);
            alert("Save failed: " + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = "Next";
        }
    });
});