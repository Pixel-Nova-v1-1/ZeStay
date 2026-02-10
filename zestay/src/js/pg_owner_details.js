import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const pgOwnerForm = document.getElementById("pgOwnerForm");
    const emailInput = document.getElementById("email");
    const pgPhotosInput = document.getElementById("pgPhotos");
    const pgUploadArea = document.getElementById("pgUploadArea");
    const roleOptions = document.querySelectorAll(".role-option");

    // Profile photo elements
    const profilePicInput = document.getElementById("profilePic");
    const profilePreview = document.getElementById("profilePreview");
    const profileDropZone = document.getElementById("profileDropZone");
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let selectedAvatarUrl = null;

    const mobileInput = document.getElementById("mobile");
    let selectedFiles = [];

    // Restrict mobile input to numbers only and 10 digits
    if (mobileInput) {
        mobileInput.addEventListener("input", (e) => {
            let val = e.target.value.replace(/[^0-9]/g, "");
            if (val.length > 10) val = val.slice(0, 10);
            e.target.value = val;
        });
    }

    // --- DOB Logic ---
    const dobDay = document.getElementById("dob-day");
    const dobMonth = document.getElementById("dob-month");
    const dobYear = document.getElementById("dob-year");
    const dobInput = document.getElementById("dob");

    // Populate Days
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement("option");
        option.value = i < 10 ? `0${i}` : i;
        option.textContent = i;
        dobDay.appendChild(option);
    }

    // Populate Years (18 years ago to 100 years ago)
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 100;
    const maxYear = currentYear - 18;
    for (let i = maxYear; i >= minYear; i--) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        dobYear.appendChild(option);
    }

    function updateDobHiddenInput() {
        const d = dobDay.value;
        const m = dobMonth.value;
        const y = dobYear.value;
        if (d && m && y) {
            dobInput.value = `${y}-${m}-${d}`;
        } else {
            dobInput.value = "";
        }
    }

    [dobDay, dobMonth, dobYear].forEach(el => {
        el.addEventListener("change", updateDobHiddenInput);
    });

    // 1. Check Auth State & Pre-fill Email
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            emailInput.value = user.email;

            // Check if user already has data
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("name").value = data.name || "";
                document.getElementById("mobile").value = data.mobile || "";
                document.getElementById("pgName").value = data.pgName || "";
                document.getElementById("address").value = data.address || "";

                // Pre-fill DOB Selects
                if (data.dob) {
                    const [y, m, d] = data.dob.split('-');
                    if (y && m && d) {
                        dobYear.value = y;
                        dobMonth.value = m;
                        dobDay.value = d;
                        dobInput.value = data.dob;
                    }
                }

                // Set Role
                if (data.roleType) {
                    roleOptions.forEach(opt => {
                        const input = opt.querySelector('input');
                        if (input.value === data.roleType) {
                            opt.click();
                        }
                    });
                }
            }
        } else {
            showToast("You must be logged in to access this page.", "warning");
            window.location.href = "regimob.html?mode=login";
        }
    });

    // 2. Handle Role Selection UI
    roleOptions.forEach(option => {
        option.addEventListener("click", () => {
            // Remove selected class from all
            roleOptions.forEach(opt => opt.classList.remove("selected"));
            // Add to clicked
            option.classList.add("selected");
            // Check the radio input
            const input = option.querySelector("input");
            input.checked = true;
        });
    });

    // 2b. Handle Avatar Selection
    avatarOptions.forEach(img => {
        img.addEventListener("click", () => {
            avatarOptions.forEach(opt => opt.classList.remove("selected"));
            if (profilePreview) {
                profilePreview.classList.add("hidden");
                profilePreview.style.backgroundImage = '';
            }

            img.classList.add("selected");
            selectedAvatarUrl = img.src;
        });
    });

    // 2c. Handle Profile Photo Upload
    if (profileDropZone) {
        profileDropZone.addEventListener("click", () => {
            if (profilePicInput) profilePicInput.click();
        });
    }

    if (profilePicInput) {
        profilePicInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) handleProfileFileSelect(file);
        });
    }

    async function handleProfileFileSelect(file) {
        const user = auth.currentUser;
        if (!user) return;

        const previousUrl = selectedAvatarUrl;

        avatarOptions.forEach(opt => opt.classList.remove("selected"));
        if (profilePreview) {
            profilePreview.classList.remove("hidden");
            profilePreview.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i></div>`;
        }

        try {
            const fileExtension = file.name.split('.').pop();
            const newFileName = `${user.uid}.${fileExtension}`;
            const renamedFile = new File([file], newFileName, { type: file.type });

            const formData = new FormData();
            formData.append("bucket-id", "default");
            formData.append("file[]", renamedFile);

            const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
            const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
            const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

            const res = await fetch(uploadUrl, { method: 'POST', body: formData });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

            const responseData = await res.json();
            const fileMetadata = responseData.processedFiles?.[0] || responseData;
            const downloadURL = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;

            // Delete old uploaded file if applicable
            if (previousUrl && previousUrl.includes(subdomain) && previousUrl !== downloadURL) {
                try {
                    const oldFileId = previousUrl.split('/').pop();
                    const deleteUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${oldFileId}`;
                    await fetch(deleteUrl, { method: 'DELETE' });
                } catch (delErr) {
                    console.warn("Failed to delete old file:", delErr);
                }
            }

            selectedAvatarUrl = downloadURL;

            if (profilePreview) {
                profilePreview.innerHTML = '';
                profilePreview.style.backgroundImage = `url(${downloadURL})`;
                profilePreview.style.backgroundSize = 'cover';
                profilePreview.style.backgroundPosition = 'center';
            }

            // Save photo immediately
            await setDoc(doc(db, "users", user.uid), {
                photoUrl: downloadURL,
                profileOption: 'upload'
            }, { merge: true });

        } catch (error) {
            console.error("Profile image upload failed:", error);
            showToast("Failed to upload image. Please try again.", "error");
            if (profilePreview) {
                profilePreview.classList.add("hidden");
                profilePreview.style.backgroundImage = '';
            }
        }
    }

    // 3. Handle File Upload — matches Post Listing (why.js) pattern
    const uploadText = pgUploadArea ? pgUploadArea.querySelector('p') : null;

    function updateUploadUI() {
        if (!uploadText) return;
        if (selectedFiles.length > 0) {
            const fileListHtml = selectedFiles.map((file, index) =>
                `<div class="selected-file-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.05); padding: 5px 10px; margin-bottom: 5px; border-radius: 5px; font-size: 0.9em;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">${file.name}</span>
                    <i class="fa-solid fa-xmark remove-file" data-index="${index}" style="cursor: pointer; color: #ff4757; padding: 5px;"></i>
                </div>`
            ).join('');

            let message = 'Click to add more';
            uploadText.innerHTML = `${fileListHtml}<span>${message} (${selectedFiles.length} selected)</span>`;
        } else {
            uploadText.innerHTML = 'Click or Drag Image to Upload<br><span>(JPG, JPEG, PNG)</span>';
        }
    }

    if (pgUploadArea) {
        pgUploadArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-file') || e.target.closest('.remove-file')) {
                e.preventDefault();
                e.stopPropagation();
                const removeBtn = e.target.classList.contains('remove-file') ? e.target : e.target.closest('.remove-file');
                const indexToRemove = parseInt(removeBtn.dataset.index);
                selectedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
                updateUploadUI();
                if (pgPhotosInput) pgPhotosInput.value = '';
                return;
            }
            if (pgPhotosInput) pgPhotosInput.click();
        });

        // Drag and drop support
        pgUploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            pgUploadArea.style.borderColor = "#00C4B4";
        });

        pgUploadArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            pgUploadArea.style.borderColor = "";
        });

        pgUploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            pgUploadArea.style.borderColor = "";
            const files = Array.from(e.dataTransfer.files);
            selectedFiles = [...selectedFiles, ...files];
            updateUploadUI();
        });
    }

    if (pgPhotosInput) {
        pgPhotosInput.addEventListener('click', (e) => e.stopPropagation());
        pgPhotosInput.addEventListener('change', () => {
            const newFiles = Array.from(pgPhotosInput.files);
            selectedFiles = [...selectedFiles, ...newFiles];
            pgPhotosInput.value = '';
            updateUploadUI();
        });
    }

    async function uploadFilesToNhost(files, userId) {
        const uploadPromises = files.map(async (file) => {
            const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
            const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
            const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

            const formData = new FormData();
            formData.append("bucket-id", "default");
            // Add unique timestamp to filename to prevent collisions or overwrites if needed
            const newFileName = `${userId}_pg_${Date.now()}_${file.name}`;
            const renamedFile = new File([file], newFileName, { type: file.type });
            formData.append("file[]", renamedFile);

            const res = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                throw new Error(`Upload failed for ${file.name}`);
            }

            const responseData = await res.json();
            const fileMetadata = responseData.processedFiles?.[0] || responseData;
            return `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;
        });

        return Promise.all(uploadPromises);
    }


    // 4. Handle Form Submit
    pgOwnerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        const roleInput = document.querySelector('input[name="role"]:checked');
        if (!roleInput) {
            showToast("Please select if you are an Owner or Agent", "warning");
            return;
        }

        const mobileValue = document.getElementById("mobile").value;
        if (mobileValue.length !== 10) {
            showToast("Mobile number must be exactly 10 digits", "warning");
            return;
        }

        if (selectedFiles.length === 0) {
            showToast("Please upload at least one photo of your PG", "warning");
            return;
        }

        const submitBtn = pgOwnerForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

        try {
            // Upload photos if any
            let photoUrls = [];
            if (selectedFiles.length > 0) {
                console.log("Uploading files...");
                photoUrls = await uploadFilesToNhost(selectedFiles, user.uid);
                console.log("Uploaded photos:", photoUrls);
            }

            // Determine profile photo URL
            let finalPhotoUrl = selectedAvatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=User";

            // Collect Data
            const formData = {
                name: document.getElementById("name").value,
                dob: document.getElementById("dob").value,
                mobile: document.getElementById("mobile").value,
                email: user.email,
                pgName: document.getElementById("pgName").value,
                address: document.getElementById("address").value,
                role: 'PG_OWNER', // System role
                roleType: roleInput.value, // User selection (Owner/Agent)
                photoUrl: finalPhotoUrl,
                profileOption: selectedAvatarUrl && !selectedAvatarUrl.includes('dicebear') ? 'upload' : 'avatar',
                pgPhotoUrls: photoUrls,
                uid: user.uid,
                updatedAt: new Date().toISOString(),
                isProfileComplete: true,
                onboardingComplete: true,
                isVerified: true // Auto-verify PG Owners
            };

            console.log("Saving PG Owner profile to Firestore...", formData);
            await setDoc(doc(db, "users", user.uid), formData, { merge: true });
            console.log("Saved.");

            showToast("Profile saved successfully!", "success");

            // Redirect
            setTimeout(() => {
                window.location.href = "index.html"; // Or admin.html if improved
            }, 1000);

        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Failed to save profile. Please try again.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Submit <i class='fa-solid fa-check'></i>";
        }
    });
});
