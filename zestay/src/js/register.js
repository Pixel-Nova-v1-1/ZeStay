import "./theme.js";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { showToast } from "./toast.js";
import { compressAndUpload, deleteFromFirebase, getStoragePath, validateImage } from "./firebaseUpload.js";

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const emailInput = document.getElementById("email");
    const profilePicInput = document.getElementById("profilePic");
    const filePreview = document.getElementById("filePreview");
    const dropZone = document.getElementById("dropZone");
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let selectedAvatarUrl = null;
    let selectedFile = null;

    // --- DOB Dropdown Setup ---
    const dobDay = document.getElementById("dob-day");
    const dobMonth = document.getElementById("dob-month");
    const dobYear = document.getElementById("dob-year");
    const dobInput = document.getElementById("dob");

    function updateDobHiddenInput() {
        if (!dobDay || !dobMonth || !dobYear || !dobInput) return;
        const d = dobDay.value;
        const m = dobMonth.value;
        const y = dobYear.value;
        if (d && m && y) {
            dobInput.value = `${y}-${m}-${d}`;
        } else {
            dobInput.value = "";
        }
    }

    if (dobDay && dobMonth && dobYear && dobInput) {
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

        [dobDay, dobMonth, dobYear].forEach(el => {
            el.addEventListener("change", updateDobHiddenInput);
        });
    }

    // 1. Check Auth State & Pre-fill Email

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            emailInput.value = user.email;

            // Check if user already has data
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data() && docSnap.data().name) {
                // Pre-fill fields if editing
                const data = docSnap.data();
                document.getElementById("name").value = data.name || "";
                document.getElementById("occupation").value = data.occupation || "";
                document.getElementById("gender").value = data.gender || "";
                
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
                
                // Pre-fill hobbies
                const hobbies = data.hobbies || "";
                const hobbyList = Array.isArray(hobbies) ? hobbies : (typeof hobbies === 'string' ? hobbies.split(',') : []);
                
                hobbyList.forEach(hobby => {
                    const option = document.querySelector(`.hobby-option[data-value="${hobby.trim()}"]`);
                    if (option) option.classList.add('selected');
                });
                document.getElementById("hobbies").value = hobbyList.join(',');

                // Pre-fill Avatar/Photo
                if (data.photoUrl) {
                    selectedAvatarUrl = data.photoUrl;
                    if (data.profileOption === 'avatar') {
                        avatarOptions.forEach(img => {
                            if (img.src === data.photoUrl) img.classList.add("selected");
                        });
                    } else if (data.profileOption === 'upload') {
                        if (filePreview) {
                            filePreview.classList.remove("hidden");
                            filePreview.style.backgroundImage = `url(${data.photoUrl})`;
                            filePreview.style.backgroundSize = 'cover';
                            filePreview.style.backgroundPosition = 'center';
                        }
                    }
                }
            } else {
                // Pre-fill from localStorage draft if available
                const savedDraft = localStorage.getItem('draft_user_form');
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        if (parsed.name) document.getElementById("name").value = parsed.name;
                        if (parsed.occupation) document.getElementById("occupation").value = parsed.occupation;
                        if (parsed.gender) document.getElementById("gender").value = parsed.gender;
                        if (parsed.dob_y) dobYear.value = parsed.dob_y;
                        if (parsed.dob_m) dobMonth.value = parsed.dob_m;
                        if (parsed.dob_d) dobDay.value = parsed.dob_d;
                        updateDobHiddenInput();

                        if (parsed.avatar) {
                            selectedAvatarUrl = parsed.avatar;
                            avatarOptions.forEach(img => {
                                if (img.src === parsed.avatar) img.classList.add("selected");
                            });
                        }
                    } catch (e) {}
                }
            }

            // Save Draft to LocalStorage dynamically
            const saveDraftToLocal = () => {
                const d = {
                    name: document.getElementById("name").value,
                    occupation: document.getElementById("occupation").value,
                    gender: document.getElementById("gender").value,
                    dob_y: dobYear.value,
                    dob_m: dobMonth.value,
                    dob_d: dobDay.value,
                    avatar: selectedAvatarUrl
                };
                localStorage.setItem('draft_user_form', JSON.stringify(d));
            };

            document.getElementById("name").addEventListener('input', saveDraftToLocal);
            document.getElementById("occupation").addEventListener('change', saveDraftToLocal);
            document.getElementById("gender").addEventListener('change', saveDraftToLocal);
            [dobDay, dobMonth, dobYear].forEach(el => el.addEventListener("change", saveDraftToLocal));
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

            // Trigger draft save immediately for avatar choice
            saveDraftToLocal();
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
            // Validate file size
            const validation = validateImage(file);
            if (!validation.valid) {
                showToast(validation.error, "error");
                filePreview.classList.add("hidden");
                return;
            }

            console.log("Starting image compression + upload to Firebase Storage...");

            // Delete old photo from storage if it exists
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().storagePath) {
                await deleteFromFirebase(userDoc.data().storagePath);
            }

            const storagePath = getStoragePath("avatars", user.uid, `profile_${Date.now()}`);
            const { url: downloadURL, storagePath: savedPath } = await compressAndUpload(file, storagePath);
            console.log("Image compressed & uploaded:", downloadURL);

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
                storagePath: savedPath,
                profileOption: 'upload'
            }, { merge: true });

            showToast("Profile photo uploaded!", "success");

        } catch (error) {
            console.error("Image upload failed:", error);
            showToast(error.message || "Failed to upload image.", "error");
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
            localStorage.removeItem('draft_user_form');
            localStorage.removeItem('draft_role');
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
