import "./theme.js";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const emailInput = document.getElementById("email");
    const profilePicInput = document.getElementById("profilePic");
    const filePreview = document.getElementById("filePreview");
    const dropZone = document.getElementById("dropZone");
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let selectedAvatarUrl = null;
    let selectedFile = null;

    // --- DOB Validation Logic ---
    const dobInput = document.getElementById("dob");
    if (dobInput) {
        const today = new Date();
        const minAge = 18;
        const maxAge = 100;

        // Calculate max date (18 years ago)
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        // Calculate min date (100 years ago)
        const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate()).toISOString().split('T')[0];

        dobInput.setAttribute("max", maxDate);
        dobInput.setAttribute("min", minDate);

        // Add input listener to enforce validation on typing
        dobInput.addEventListener('change', function() {
            const value = new Date(this.value);
            const min = new Date(minDate);
            const max = new Date(maxDate);

            if (value > max) {
                showToast(`You must be at least ${minAge} years old.`, "warning");
                this.value = maxDate;
            } else if (value < min) {
                showToast("Please enter a valid date of birth.", "warning");
                this.value = minDate;
            }
        });
    }

    // 1. Check Auth State & Pre-fill Email
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            emailInput.value = user.email;

            // Check if user already has data
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                // Optional: Pre-fill other fields if editing
                const data = docSnap.data();
                document.getElementById("name").value = data.name || "";
                document.getElementById("dob").value = data.dob || "";
                document.getElementById("occupation").value = data.occupation || "";
                document.getElementById("gender").value = data.gender || "";
                
                // Pre-fill hobbies
                const hobbies = data.hobbies || "";
                // Handle both array and string (legacy)
                const hobbyList = Array.isArray(hobbies) ? hobbies : (typeof hobbies === 'string' ? hobbies.split(',') : []);
                
                hobbyList.forEach(hobby => {
                    const option = document.querySelector(`.hobby-option[data-value="${hobby.trim()}"]`);
                    if (option) option.classList.add('selected');
                });
                document.getElementById("hobbies").value = hobbyList.join(',');
            }
        } else {
            showToast("You must be logged in to access this page.", "warning");
            window.location.href = "regimob.html?mode=login";
        }
    });

    // 2. Handle Avatar Selection
    avatarOptions.forEach(img => {
        img.addEventListener("click", () => {
            // Deselect others
            avatarOptions.forEach(opt => opt.classList.remove("selected"));
            filePreview.classList.add("hidden");
            selectedFile = null; // Clear file if avatar selected

            // Select this
            img.classList.add("selected");
            selectedAvatarUrl = img.src;
        });
    });

    // Handle Hobby Selection
    const hobbyOptions = document.querySelectorAll('.hobby-option');
    hobbyOptions.forEach(option => {
        option.addEventListener('click', () => {
            option.classList.toggle('selected');
            updateHobbiesInput();
        });
    });

    function updateHobbiesInput() {
        const selectedHobbies = Array.from(document.querySelectorAll('.hobby-option.selected'))
            .map(opt => opt.dataset.value);
        document.getElementById('hobbies').value = selectedHobbies.join(',');
    }

    // 3. Handle File Upload Preview
    profilePicInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    dropZone.addEventListener("click", () => profilePicInput.click());

    async function handleFileSelect(file) {
        const user = auth.currentUser;
        if (!user) return;

        // Capture previous URL for deletion
        const previousUrl = selectedAvatarUrl;

        // UI updates
        avatarOptions.forEach(opt => opt.classList.remove("selected"));
        filePreview.classList.remove("hidden");
        filePreview.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i></div>`;

        try {
            console.log("Starting immediate image upload to Cloudinary...");

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", uploadPreset);
            // Cloudinary will auto-generate a unique ID
            formData.append("folder", "avatars");

            const res = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Upload failed: ${res.status} ${errorText}`);
            }

            const responseData = await res.json();
            const downloadURL = `${responseData.secure_url}?t=${Date.now()}`;
            const publicId = responseData.public_id;
            console.log("Image uploaded to Cloudinary:", downloadURL, publicId);

            selectedAvatarUrl = downloadURL;
            selectedFile = null;

            // Show preview
            filePreview.innerHTML = '';
            filePreview.style.backgroundImage = `url(${downloadURL})`;
            filePreview.style.backgroundSize = 'cover';
            filePreview.style.backgroundPosition = 'center';

            // Update user profile immediately (using setDoc to ensure doc exists)
            await setDoc(doc(db, "users", user.uid), {
                photoUrl: downloadURL,
                photoPublicId: publicId,
                profileOption: 'upload'
            }, { merge: true });

            showToast("Profile photo uploaded!", "success");

        } catch (error) {
            console.error("Image upload failed:", error);
            let errMsg = "Failed to upload image.";
            if (error.message.includes("400")) errMsg += " (Check Cloudinary Preset)";
            showToast(errMsg, "error");
            filePreview.classList.add("hidden");
            filePreview.style.backgroundImage = '';
        }
    }

    // 4. Handle Form Submit
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        const submitBtn = registerForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

        try {
            // Use selectedAvatarUrl (which is now the uploaded URL or selected avatar)
            let finalPhotoUrl = selectedAvatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=User"; // Default

            // Collect Data
            const formData = {
                name: document.getElementById("name").value,
                dob: document.getElementById("dob").value,
                email: user.email,
                occupation: document.getElementById("occupation").value,
                gender: document.getElementById("gender").value,
                hobbies: Array.from(document.querySelectorAll('.hobby-option.selected')).map(opt => opt.dataset.value),
                photoUrl: finalPhotoUrl,
                profileOption: selectedAvatarUrl && !selectedAvatarUrl.includes('dicebear') ? 'upload' : 'avatar',
                uid: user.uid,
                updatedAt: new Date().toISOString()
            };

            console.log("Saving to Firestore...", formData);
            // Save to Firestore
            await setDoc(doc(db, "users", user.uid), formData, { merge: true });
            console.log("Saved to Firestore.");

            // Redirect to Preferences
            window.location.href = "preference.html";

        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Failed to save profile. Please try again.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Next <i class='fa-solid fa-chevron-right'></i>";
        }
    });
});
