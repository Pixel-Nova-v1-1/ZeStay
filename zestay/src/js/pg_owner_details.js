import "./theme.js";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { showToast } from "./toast.js";
import { compressAndUpload, deleteFromFirebase, getStoragePath, validateImage } from "./firebaseUpload.js";

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
    let selectedFiles = [];
    let savePgDraft = () => {};

    // 1. Check Auth State & Pre-fill Email
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            emailInput.value = user.email;

            // Check if user already has data
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data() && docSnap.data().name) {
                const data = docSnap.data();
                document.getElementById("name").value = data.name || "";
                document.getElementById("pgName").value = data.pgName || "";
                document.getElementById("address").value = data.address || "";

                // Set Role
                if (data.roleType) {
                    roleOptions.forEach(opt => {
                        const input = opt.querySelector('input');
                        if (input.value === data.roleType) {
                            opt.click();
                        }
                    });
                }

                // Pre-fill Avatar/Photo
                if (data.photoUrl) {
                    selectedAvatarUrl = data.photoUrl;
                    if (data.profileOption === 'avatar') {
                        avatarOptions.forEach(img => {
                            if (img.src === data.photoUrl) img.classList.add("selected");
                        });
                    } else if (data.profileOption === 'upload') {
                        if (profilePreview) {
                            profilePreview.classList.remove("hidden");
                            profilePreview.style.backgroundImage = `url(${data.photoUrl})`;
                            profilePreview.style.backgroundSize = 'cover';
                            profilePreview.style.backgroundPosition = 'center';
                        }
                    }
                }
            } else {
                const draft = localStorage.getItem('draft_pg_form');
                if (draft) {
                   try {
                     const parsed = JSON.parse(draft);
                     if(parsed.name) document.getElementById("name").value = parsed.name;
                     if(parsed.pgName) document.getElementById("pgName").value = parsed.pgName;
                     if(parsed.address) document.getElementById("address").value = parsed.address;

                     if (parsed.avatar) {
                        selectedAvatarUrl = parsed.avatar;
                        avatarOptions.forEach(img => {
                            if (img.src === parsed.avatar) img.classList.add("selected");
                        });
                      }
                   } catch(e) {}
                }
            }
            
            savePgDraft = () => {
                const d = {
                    name: document.getElementById("name").value,
                    pgName: document.getElementById("pgName").value,
                    address: document.getElementById("address").value,
                    avatar: selectedAvatarUrl
                };
                localStorage.setItem('draft_pg_form', JSON.stringify(d));
            };

            ["name", "pgName", "address"].forEach(id => {
               document.getElementById(id)?.addEventListener('input', savePgDraft);
            });

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
            
            // Trigger draft save immediately
            savePgDraft();
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
            // Validate file size
            const validation = validateImage(file);
            if (!validation.valid) {
                showToast(validation.error, "error");
                if (profilePreview) {
                    profilePreview.classList.add("hidden");
                    profilePreview.style.backgroundImage = '';
                }
                return;
            }

            // Delete old photo from storage if it exists
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().storagePath) {
                await deleteFromFirebase(userDoc.data().storagePath);
            }

            const storagePath = getStoragePath("avatars", user.uid, `profile_${Date.now()}`);
            const { url: downloadURL, storagePath: savedPath } = await compressAndUpload(file, storagePath);

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
                storagePath: savedPath,
                profileOption: 'upload'
            }, { merge: true });

        } catch (error) {
            console.error("Profile image upload failed:", error);
            showToast(error.message || "Failed to upload image. Please try again.", "error");
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

    async function uploadFilesToFirebaseStorage(files, userId) {
        const uploadPromises = files.map(async (file) => {
            // Validate each file
            const validation = validateImage(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const storagePath = getStoragePath("listings", userId, `${Date.now()}_${file.name}`);
            const { url, storagePath: savedPath } = await compressAndUpload(file, storagePath);
            return {
                url: url,
                storagePath: savedPath
            };
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


        if (selectedFiles.length === 0) {
            showToast("Please upload at least one photo of your PG", "warning");
            return;
        }

        const submitBtn = pgOwnerForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

        try {
            // Upload photos if any
            let photoData = [];
            if (selectedFiles.length > 0) {
                console.log("Uploading files to Firebase Storage...");
                photoData = await uploadFilesToFirebaseStorage(selectedFiles, user.uid);
                console.log("Uploaded photos:", photoData);
            }

            const photoUrls = photoData.map(p => p.url);
            const photoStoragePaths = photoData.map(p => p.storagePath);

            // Determine profile photo URL
            let finalPhotoUrl = selectedAvatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=User";

            // Collect Form Data
            const activeRoleInput = document.querySelector('input[name="role"]:checked');
            
            const formData = {
                roleType: activeRoleInput.value,
                name: document.getElementById("name").value.trim(),
                email: user.email,
                mobile: user.phoneNumber || "",
                pgName: document.getElementById("pgName").value.trim(),
                address: document.getElementById("address").value.trim(),
                role: 'PG_OWNER',
                photoUrl: finalPhotoUrl,
                storagePath: selectedAvatarUrl && !selectedAvatarUrl.includes('dicebear') ? (await (await getDoc(doc(db, "users", user.uid))).data()?.storagePath) : null,
                profileOption: selectedAvatarUrl && !selectedAvatarUrl.includes('dicebear') ? 'upload' : 'avatar',
                pgPhotoUrls: photoUrls,
                pgPhotoStoragePaths: photoStoragePaths,
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

            localStorage.removeItem('draft_pg_form');
            localStorage.removeItem('draft_role');

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
