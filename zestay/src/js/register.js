import { auth, db } from "../firebase";
import { nhost } from "../nhost";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const emailInput = document.getElementById("email");
    const profilePicInput = document.getElementById("profilePic");
    const filePreview = document.getElementById("filePreview");
    const dropZone = document.getElementById("dropZone");
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let selectedAvatarUrl = null;
    let selectedFile = null;

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
                document.getElementById("hobbies").value = data.hobbies || "";
            }
        } else {
            alert("You must be logged in to access this page.");
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
            console.log("Starting immediate image upload to Nhost (Manual Fetch)...");

            // Rename file to use Firebase UID
            const fileExtension = file.name.split('.').pop();
            const newFileName = `${user.uid}.${fileExtension}`;
            const renamedFile = new File([file], newFileName, { type: file.type });

            // Manual Fetch Upload
            const formData = new FormData();
            formData.append("bucket-id", "default");
            formData.append("file[]", renamedFile);

            const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
            const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
            const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

            console.log("Upload URL:", uploadUrl);

            const res = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Upload failed with status:", res.status);
                throw new Error(`Upload failed: ${res.status} ${errorText}`);
            }

            const responseData = await res.json();
            const fileMetadata = responseData.processedFiles?.[0] || responseData;

            console.log("Upload successful, metadata:", fileMetadata);

            const downloadURL = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;
            console.log("Image URL:", downloadURL);

            // --- Delete Old File Logic ---
            if (previousUrl && previousUrl.includes(subdomain) && previousUrl !== downloadURL) {
                try {
                    console.log("Deleting old file:", previousUrl);
                    const oldFileId = previousUrl.split('/').pop();
                    const deleteUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${oldFileId}`;
                    await fetch(deleteUrl, { method: 'DELETE' });
                    console.log("Old file deleted.");
                } catch (delErr) {
                    console.warn("Failed to delete old file:", delErr);
                }
            }

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
                profileOption: 'upload'
            }, { merge: true });

        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Failed to upload image. Please try again.");
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
                hobbies: document.getElementById("hobbies").value,
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
            alert("Failed to save profile. Please try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Next <i class='fa-solid fa-chevron-right'></i>";
        }
    });
});
