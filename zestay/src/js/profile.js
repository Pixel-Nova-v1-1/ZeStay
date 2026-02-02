import { auth, db } from "../firebase";
import { nhost } from "../nhost";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, orderBy } from "firebase/firestore";
import { showToast, showConfirm } from "./toast.js";

document.addEventListener('DOMContentLoaded', () => {

    const profileNameEl = document.getElementById('profileName');
    const profileAvatarEl = document.getElementById('profileAvatar');
    const preferencesGrid = document.getElementById('userPreferencesGrid');
    const listingsContainer = document.getElementById('userListingsContainer');
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const inputs = document.querySelectorAll('.profile-details-form input, .profile-details-form select');
    const genderPillDisplay = document.getElementById('display-gender');
    const avatarUploadInput = document.getElementById('avatarUploadInput');

    // --- DOB Validation Logic ---
    const dobInput = document.getElementById("display-dob");
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
        dobInput.addEventListener('change', function () {
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

    // Modal Elements
    const openUploadModalBtn = document.getElementById('openUploadModalBtn');
    const profileUploadModal = document.getElementById('profileUploadModal');
    const closeModal = document.querySelector('.close-modal');
    const btnUploadPhoto = document.getElementById('btnUploadPhoto');
    const btnChooseAvatar = document.getElementById('btnChooseAvatar');
    const btnRemovePhoto = document.getElementById('btnRemovePhoto');
    const uploadOptions = document.getElementById('uploadOptions');
    const avatarSelectionArea = document.getElementById('avatarSelectionArea');
    const btnBackToOptions = document.getElementById('btnBackToOptions');
    const avatarOptionsModal = document.querySelectorAll('.avatar-option-modal');

    // --- Edit Modal Elements (Moved to top scope) ---
    const reqModal = document.getElementById('reqModal');
    const roomModal = document.getElementById('roomModal');
    const closeReqBtn = document.getElementById('closeReqModal');
    const closeRoomBtn = document.getElementById('closeRoomModal');
    const reqForm = document.getElementById('reqForm');
    const roomForm = document.getElementById('roomForm');

    let isEditing = false;
    let currentUser = null;

    // Preference Map (Upstream version with images + Legacy Support)
    const preferenceMap = {
        // New Keys (Hyphens)
        'night-owl': { label: 'Night Owl', image: '/images/nightowl.png' },
        'early-bird': { label: 'Early Bird', image: '/images/earlybird.png' },
        'music-lover': { label: 'Music Lover', image: '/images/music.png' },
        'quiet-seeker': { label: 'Quiet Seeker', image: '/images/quiet.png' },
        'pet-lover': { label: 'Pet Lover', image: '/images/petlover.png' },
        'studious': { label: 'Studious', image: '/images/studious.png' },
        'sporty': { label: 'Sporty', image: '/images/sporty.png' },
        'guest-friendly': { label: 'Guest Friendly', image: '/images/guestfriendly.png' },
        'wanderer': { label: 'Wanderer', image: '/images/wanderer.png' },
        'clean-centric': { label: 'Clean centric', image: '/images/cleaner.png' },
        'non-alcoholic': { label: 'Non-alcoholic', image: '/images/nonalcoholic.png' },
        'non-smoker': { label: 'Non-smoker', image: '/images/nonsmoker.png' },

        // Legacy Keys (Underscores) - Mapping to same images
        'night_owl': { label: 'Night Owl', image: '/images/nightowl.png' },
        'early_bird': { label: 'Early Bird', image: '/images/earlybird.png' },
        'music_lover': { label: 'Music Lover', image: '/images/music.png' },
        'quiet_seeker': { label: 'Quiet Seeker', image: '/images/quiet.png' },
        'pet_lover': { label: 'Pet Lover', image: '/images/petlover.png' },
        'guest_friendly': { label: 'Guest Friendly', image: '/images/guestfriendly.png' },
        'clean_centric': { label: 'Clean centric', image: '/images/cleaner.png' },
        'non_alcoholic': { label: 'Non-alcoholic', image: '/images/nonalcoholic.png' },
        'non_smoker': { label: 'Non-smoker', image: '/images/nonsmoker.png' }
    };

    // Canonical List for Rendering (to avoid duplicates)
    const preferenceOptions = [
        'night-owl', 'early-bird', 'music-lover', 'quiet-seeker',
        'pet-lover', 'studious', 'sporty', 'guest-friendly',
        'wanderer', 'clean-centric', 'non-alcoholic', 'non-smoker'
    ];

    // Helper: Delete old Nhost file
    async function deleteOldNhostFile(oldUrl) {
        if (!oldUrl) return;

        const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
        const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";

        if (oldUrl.includes(subdomain)) {
            try {
                console.log("Deleting old file:", oldUrl);
                const oldFileId = oldUrl.split('/').pop();
                const deleteUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${oldFileId}`;
                await fetch(deleteUrl, { method: 'DELETE' });
                console.log("Old file deleted successfully.");
            } catch (err) {
                console.warn("Failed to delete old file:", err);
            }
        }
    }

    // 1. Auth Check & Load Data
    console.log("Checking auth state...");
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User logged in:", user.uid);
            currentUser = user;
            await loadUserProfile(user.uid);
        } else {
            console.log("No user logged in, redirecting...");
            window.location.href = "regimob.html?mode=login";
        }
    });

    async function loadUserProfile(uid) {
        try {
            console.log("Loading user profile for:", uid);
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log("User data found:", docSnap.data());
                const data = docSnap.data();

                // Populate Fields
                profileNameEl.textContent = data.name || "User";

                // Verification Badge
                const verificationBadge = document.getElementById('verificationBadge');
                if (verificationBadge) {
                    if (data.isVerified) {
                        verificationBadge.style.display = 'inline-flex';
                    } else {
                        verificationBadge.style.display = 'none';
                    }
                }

                // Update Avatar
                if (profileAvatarEl) {
                    profileAvatarEl.src = data.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.name || 'User'}`;
                }

                // Update Navbar Profile Icon
                const navProfileBtn = document.getElementById('headerProfileBtn');
                if (navProfileBtn) {
                    const navImg = document.createElement('img');
                    navImg.src = data.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.name || 'User'}`;
                    navImg.style.width = '35px';
                    navImg.style.height = '35px';
                    navImg.style.borderRadius = '50%';
                    navImg.style.objectFit = 'cover';
                    navImg.style.border = '2px solid white';
                    navProfileBtn.innerHTML = '';
                    navProfileBtn.appendChild(navImg);
                }

                document.getElementById('display-name').value = data.name || "";
                document.getElementById('display-email').value = data.email || "";
                document.getElementById('display-occupation').value = data.occupation || "";
                document.getElementById('display-dob').value = data.dob || "";

                // Set Hobbies
                const hobbies = data.hobbies || "";
                const hobbyList = Array.isArray(hobbies) ? hobbies : (typeof hobbies === 'string' ? hobbies.split(',') : []);
                const hobbyOptions = document.querySelectorAll('#display-hobbies-container .hobby-option');

                hobbyOptions.forEach(opt => {
                    if (hobbyList.includes(opt.dataset.value)) {
                        opt.classList.add('selected');
                    } else {
                        opt.classList.remove('selected');
                    }
                });

                // Set Gender
                if (data.gender) {
                    const genderOptions = genderPillDisplay.querySelectorAll('.gender-option');
                    genderOptions.forEach(opt => {
                        if (opt.textContent.trim() === data.gender) {
                            opt.classList.add('active');
                        } else {
                            opt.classList.remove('active');
                        }
                    });
                }

                // Load Preferences
                if (data.preferences) {
                    loadPreferences(data.preferences);
                }

                // Load Listings (My Profile Card)
                loadUserListings(data, uid);

                // Load Notifications
                loadUserNotifications(uid);

                isEditing = false;
                editProfileBtn.style.display = 'block';
                saveProfileBtn.style.display = 'none';
                inputs.forEach(input => {
                    if (input.tagName === 'SELECT') {
                        input.disabled = true;
                    } else {
                        input.setAttribute('readonly', true);
                    }
                    input.style.backgroundColor = '#f1f2f6';
                    input.style.borderColor = 'transparent';
                });
                genderPillDisplay.classList.remove('editing');
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    }

    // 2. Profile Picture Modal Logic

    // Open Modal
    if (openUploadModalBtn) {
        openUploadModalBtn.addEventListener('click', () => {
            profileUploadModal.style.display = 'flex';
            // Reset view
            uploadOptions.style.display = 'flex';
            avatarSelectionArea.style.display = 'none';
        });
    }

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            profileUploadModal.style.display = 'none';
        });
    }

    // Close on outside click
    window.addEventListener('click', (event) => {
        if (event.target == profileUploadModal) {
            profileUploadModal.style.display = 'none';
        }
        // Also close lightbox if open
        const lightboxModal = document.getElementById('avatarLightbox');
        if (event.target == lightboxModal) {
            lightboxModal.style.display = 'none';
        }
    });

    // Helper: Update User Info in All chats
    async function updateUserInChats(uid, updates) {
        try {
            console.log("Updating chats for user:", uid, updates);
            // Query all chats where this user is a participant
            const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
            const querySnapshot = await getDocs(q);

            const updatePromises = querySnapshot.docs.map(docSnap => {
                const chatData = docSnap.data();

                // Construct update map for nested fields
                const firestoreUpdate = {};
                if (updates.photoUrl) {
                    firestoreUpdate[`userInfo.${uid}.avatar`] = updates.photoUrl;
                }
                if (updates.name) {
                    firestoreUpdate[`userInfo.${uid}.name`] = updates.name;
                }

                return updateDoc(doc(db, "chats", docSnap.id), firestoreUpdate);
            });

            await Promise.all(updatePromises);
            console.log(`Updated ${updatePromises.length} chats with new info.`);
        } catch (error) {
            console.error("Error updating chats with new info:", error);
        }
    }


    // Option 1: Upload Photo
    if (btnUploadPhoto) {
        btnUploadPhoto.addEventListener('click', () => {
            avatarUploadInput.click();
        });
    }

    // Handle File Selection (Existing Logic Adapted)
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !currentUser) return;

            // Visual Feedback: Show spinner/opacity
            const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
            const originalSrc = profileAvatarEl.src;

            // Ensure wrapper is relative for absolute positioning of spinner
            avatarWrapper.style.position = 'relative';

            // Create spinner overlay if it doesn't exist
            let spinner = avatarWrapper.querySelector('.upload-spinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.className = 'upload-spinner';
                spinner.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                spinner.style.position = 'absolute';
                spinner.style.top = '0';
                spinner.style.left = '0';
                spinner.style.width = '100%';
                spinner.style.height = '100%';
                spinner.style.background = 'rgba(0,0,0,0.5)';
                spinner.style.color = 'white';
                spinner.style.display = 'flex';
                spinner.style.alignItems = 'center';
                spinner.style.justifyContent = 'center';
                spinner.style.borderRadius = '50%';
                spinner.style.fontSize = '2rem';
                spinner.style.zIndex = '10'; // Ensure it's on top
                avatarWrapper.appendChild(spinner);
            }
            spinner.style.display = 'flex';
            profileUploadModal.style.display = 'none'; // Close modal immediately

            try {
                console.log("Starting upload for user:", currentUser.uid);

                // Create a timeout promise (15 seconds)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 15000)
                );

                // The actual upload task
                const uploadTask = async () => {
                    console.log("Uploading to Nhost (Manual Fetch)...");

                    // Rename file to use Firebase UID
                    const fileExtension = file.name.split('.').pop();
                    const newFileName = `${currentUser.uid}.${fileExtension}`;
                    const renamedFile = new File([file], newFileName, { type: file.type });


                    // Manual Fetch Upload to bypass SDK "file[]" issue
                    const formData = new FormData();
                    // Append bucket-id FIRST (some servers are picky about order)
                    formData.append("bucket-id", "default");

                    // Use "file[]" as confirmed by Test 3
                    formData.append("file[]", renamedFile);

                    // Construct URL manually since nhost.storage.url is undefined
                    const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
                    const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
                    const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

                    const res = await fetch(uploadUrl, {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(`Upload failed: ${res.status} ${errorText}`);
                    }

                    const responseData = await res.json();
                    const fileMetadata = responseData.processedFiles?.[0] || responseData;

                    // Manual Public URL construction
                    const downloadURL = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;
                    console.log("Download URL:", downloadURL);

                    // --- Delete Old File Logic ---
                    try {
                        const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
                        if (userDocSnap.exists()) {
                            const oldUrl = userDocSnap.data().photoUrl;
                            if (oldUrl && oldUrl !== downloadURL) {
                                await deleteOldNhostFile(oldUrl);
                            }
                        }
                    } catch (delErr) {
                        console.warn("Failed to delete old file:", delErr);
                    }

                    // Update Firestore
                    await updateDoc(doc(db, "users", currentUser.uid), {
                        photoUrl: downloadURL,
                        profileOption: 'upload'
                    });

                    // --- SYNC CHATS ---
                    updateUserInChats(currentUser.uid, { photoUrl: downloadURL });

                    return downloadURL;
                };

                // Race them
                const downloadURL = await Promise.race([uploadTask(), timeoutPromise]);

                // Update UI
                profileAvatarEl.src = downloadURL;
                console.log("Profile updated successfully");

            } catch (error) {
                console.error("Error uploading avatar:", error);
                showToast("Failed to upload avatar: " + error.message, "error");
                profileAvatarEl.src = originalSrc; // Revert on error
            } finally {
                spinner.style.display = 'none';
                avatarUploadInput.value = '';
            }
        });
    }

    // Option 2: Remove Photo
    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', async () => {
            if (!currentUser) return;
            const confirmed = await showConfirm("Are you sure you want to remove your profile photo?");
            if (!confirmed) return;

            const defaultAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${currentUser.displayName || 'User'}`;

            try {
                // Delete old file from Nhost if exists
                const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (userDocSnap.exists()) {
                    const oldUrl = userDocSnap.data().photoUrl;
                    await deleteOldNhostFile(oldUrl);
                }

                // Update Firestore
                await updateDoc(doc(db, "users", currentUser.uid), {
                    photoUrl: defaultAvatar,
                    profileOption: 'default'
                });

                // --- SYNC CHATS ---
                updateUserInChats(currentUser.uid, { photoUrl: defaultAvatar });

                // Update UI
                profileAvatarEl.src = defaultAvatar;
                profileUploadModal.style.display = 'none';
                showToast("Profile photo removed.", "success");

            } catch (error) {
                console.error("Error removing photo:", error);
                showToast("Failed to remove photo.", "error");
            }
        });
    }

    // Option 3: Choose Avatar
    if (btnChooseAvatar) {
        btnChooseAvatar.addEventListener('click', () => {
            uploadOptions.style.display = 'none';
            avatarSelectionArea.style.display = 'block';
        });
    }

    if (btnBackToOptions) {
        btnBackToOptions.addEventListener('click', () => {
            avatarSelectionArea.style.display = 'none';
            uploadOptions.style.display = 'flex';
        });
    }

    // Avatar Selection Logic
    avatarOptionsModal.forEach(img => {
        img.addEventListener('click', async () => {
            if (!currentUser) return;
            const selectedUrl = img.dataset.url;

            try {
                // Delete old file from Nhost if exists
                const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (userDocSnap.exists()) {
                    const oldUrl = userDocSnap.data().photoUrl;
                    await deleteOldNhostFile(oldUrl);
                }

                // Update Firestore
                await updateDoc(doc(db, "users", currentUser.uid), {
                    photoUrl: selectedUrl,
                    profileOption: 'avatar'
                });

                // --- SYNC CHATS ---
                updateUserInChats(currentUser.uid, { photoUrl: selectedUrl });

                // Update UI
                profileAvatarEl.src = selectedUrl;
                profileUploadModal.style.display = 'none';

            } catch (error) {
                console.error("Error updating avatar:", error);
                showToast("Failed to update avatar.", "error");
            }
        });
    });


    // 3. Edit/Save Profile Logic
    if (editProfileBtn && saveProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            isEditing = true;
            editProfileBtn.style.display = 'none';
            saveProfileBtn.style.display = 'block';
            inputs.forEach(input => {
                if (input.id !== 'display-email') { // Email usually read-only
                    if (input.tagName === 'SELECT') {
                        input.disabled = false;
                    } else {
                        input.removeAttribute('readonly');
                    }
                    input.style.backgroundColor = '#fff';
                    input.style.borderColor = '#1abc9c';
                }
            });
            genderPillDisplay.classList.add('editing');
            const hobbiesContainer = document.getElementById('display-hobbies-container');
            if (hobbiesContainer) hobbiesContainer.classList.add('editing');
        });

        saveProfileBtn.addEventListener('click', async () => {
            if (!currentUser) return;

            saveProfileBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

            const newName = document.getElementById('display-name').value;
            const newOccupation = document.getElementById('display-occupation').value;
            const activeGenderEl = genderPillDisplay.querySelector('.active');
            const newGender = activeGenderEl ? activeGenderEl.textContent : 'Male';

            const selectedHobbies = Array.from(document.querySelectorAll('#display-hobbies-container .hobby-option.selected'))
                .map(opt => opt.dataset.value);

            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    name: newName,
                    occupation: newOccupation,
                    gender: newGender,
                    dob: document.getElementById('display-dob').value,
                    hobbies: selectedHobbies
                });

                // --- SYNC CHATS ---
                await updateUserInChats(currentUser.uid, { name: newName });

                profileNameEl.textContent = newName;
                showToast("Profile updated!", "success");

                // Reset UI
                isEditing = false;
                editProfileBtn.style.display = 'block';
                saveProfileBtn.style.display = 'none';
                saveProfileBtn.innerHTML = 'Save Changes <i class="fa-solid fa-check"></i>';

                inputs.forEach(input => {
                    if (input.tagName === 'SELECT') {
                        input.disabled = true;
                    } else {
                        input.setAttribute('readonly', true);
                    }
                    input.style.backgroundColor = '#f1f2f6';
                    input.style.borderColor = 'transparent';
                });
                genderPillDisplay.classList.remove('editing');
                const hobbiesContainer = document.getElementById('display-hobbies-container');
                if (hobbiesContainer) hobbiesContainer.classList.remove('editing');

            } catch (error) {
                console.error("Error saving profile:", error);
                showToast("Failed to save profile.", "error");
                saveProfileBtn.innerHTML = 'Save Changes <i class="fa-solid fa-check"></i>';
            }
        });
    }

    // Gender Selection
    if (genderPillDisplay) {
        genderPillDisplay.addEventListener('click', (e) => {
            if (!isEditing) return;
            if (e.target.classList.contains('gender-option')) {
                const options = genderPillDisplay.querySelectorAll('.gender-option');
                options.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    // Hobbies Selection
    const hobbiesContainer = document.getElementById('display-hobbies-container');
    if (hobbiesContainer) {
        hobbiesContainer.addEventListener('click', (e) => {
            if (!isEditing) return;
            if (e.target.classList.contains('hobby-option')) {
                e.target.classList.toggle('selected');
            }
        });
    }

    // 4. Preferences Logic
    function loadPreferences(prefIds) {
        preferencesGrid.innerHTML = '';

        // Render ONLY canonical options from preferenceOptions
        preferenceOptions.forEach(key => {
            const map = preferenceMap[key];
            // Check if user has this preference (checking both hyphen and underscore versions)
            const legacyKey = key.replace(/-/g, '_');
            const isSelected = prefIds.includes(key) || prefIds.includes(legacyKey);

            const div = document.createElement('div');
            div.className = `pref-item ${isSelected ? 'selected' : ''}`;
            div.style.pointerEvents = 'none';

            // Updated to use images
            div.innerHTML = `
                <div class="icon-circle">
                     <img src="${map.image}" alt="${map.label}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                </div>
                <span class="pref-label">${map.label}</span>
             `;
            preferencesGrid.appendChild(div);
        });
    }

    async function loadUserListings(userData, uid) {
        if (!listingsContainer) return;

        listingsContainer.innerHTML = '<p style="text-align:center; width:100%;">Loading listings...</p>';

        try {
            // Check for flats
            const flatsQuery = query(collection(db, "flats"), where("userId", "==", uid));
            const flatsSnapshot = await getDocs(flatsQuery);

            // Check for requirements
            const reqQuery = query(collection(db, "requirements"), where("userId", "==", uid));
            const reqSnapshot = await getDocs(reqQuery);

            listingsContainer.innerHTML = ''; // Clear loading

            if (flatsSnapshot.empty && reqSnapshot.empty) {
                listingsContainer.innerHTML = '<p style="text-align:center; width:100%;">No listings found.</p>';
                return;
            }

            // Render Flats
            flatsSnapshot.forEach(doc => {
                const data = doc.data();
                renderListingCard(doc.id, data, 'flat');
            });

            // Render Requirements
            reqSnapshot.forEach(doc => {
                const data = doc.data();
                renderListingCard(doc.id, data, 'requirement');
            });

        } catch (error) {
            console.error("Error loading listings:", error);
            listingsContainer.innerHTML = '<p style="text-align:center; width:100%; color:red;">Error loading listings.</p>';
        }
    }

    async function loadUserNotifications(uid) {
        const notifContainer = document.getElementById('notificationsContainer');
        if (!notifContainer) return;

        notifContainer.innerHTML = '<p style="text-align:center; width:100%;">Loading notifications...</p>';

        try {
            // Fetch all notifications for user (Client-side sort to avoid index issues)
            const q = query(
                collection(db, "notifications"),
                where("userId", "==", uid)
            );
            const querySnapshot = await getDocs(q);

            notifContainer.innerHTML = ''; // Clear loading

            if (querySnapshot.empty) {
                notifContainer.innerHTML = '<p class="empty-state">No new notifications.</p>';
                return;
            }

            // Convert to array and sort
            const notifications = [];
            querySnapshot.forEach(doc => {
                notifications.push(doc.data());
            });

            notifications.sort((a, b) => {
                const tA = a.timestamp ? a.timestamp.seconds : 0;
                const tB = b.timestamp ? b.timestamp.seconds : 0;
                return tB - tA; // Descending
            });

            notifications.forEach(notif => {
                const date = notif.timestamp ? notif.timestamp.toDate() : new Date();
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const iconClass = notif.type === 'success' ? 'fa-check' : (notif.type === 'error' ? 'fa-xmark' : 'fa-bell');
                const bgClass = notif.type === 'success' ? '#2ecc71' : (notif.type === 'error' ? '#e74c3c' : 'var(--primary-teal)');

                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <div class="notif-icon-circle" style="background: ${bgClass}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="notif-content">
                        <h4>${notif.title}</h4>
                        <p>${notif.message}</p>
                        <span class="notif-date">${dateStr}</span>
                        <span class="notif-time">${timeStr}</span>
                    </div>
                    ${!notif.read ? '<div class="notif-dot"></div>' : ''}
                `;
                notifContainer.appendChild(item);
            });

            // Mark as read after rendering
            markNotificationsAsRead(uid, notifications);

        } catch (error) {
            console.error("Error loading notifications:", error);
            // Fallback for missing index error on first run
            if (error.code === 'failed-precondition') {
                notifContainer.innerHTML = '<p style="text-align:center; width:100%;">Please create the required index in Firebase Console.</p>';
            } else {
                notifContainer.innerHTML = '<p style="text-align:center; width:100%; color:red;">Error loading notifications.</p>';
            }
        }
    }

    async function markNotificationsAsRead(uid, notifications) {
        const unreadDocs = notifications.filter(n => !n.read && n.id);
        if (unreadDocs.length === 0) return;

        // Since we don't have the doc ID in the data pushed above, let's re-fetch or assume we need to query
        // Actually, the previous query didn't save ID. Let's fix that first.

        try {
            const q = query(
                collection(db, "notifications"),
                where("userId", "==", uid),
                where("read", "==", false)
            );
            const snap = await getDocs(q);
            const updates = snap.docs.map(doc => updateDoc(doc.ref, { read: true }));
            await Promise.all(updates);
            console.log("Marked notifications as read:", updates.length);
        } catch (e) {
            console.error("Error marking notifications read:", e);
        }
    }

    function renderListingCard(docId, data, type) {
        // Standardized Display: Always show Location (City/State) only, as requested.
        // Full Address is still saved but only shown on the detailed public page (for Flats).
        const displayLocation = data.location || 'Location not specified';
        const rent = data.rent ? `₹ ${data.rent}` : 'Rent not specified';
        const typeLabel = type === 'flat' ? 'Room/Flat' : 'Roommate Requirement';
        const gender = data.gender || 'Any';

        const card = document.createElement('div');
        card.className = 'listing-card';
        card.style.maxWidth = '600px';
        card.style.margin = '10px auto';
        card.style.position = 'relative';

        card.innerHTML = `
            <div class="card-content">
                <div class="card-details" style="margin-left: 0;">
                    <h3>${typeLabel}</h3>
                    <p class="location"><i class="fa-solid fa-location-dot"></i> ${displayLocation}</p>
                    
                    <div class="card-info-grid">
                        <div class="info-item">
                            <span class="label">Rent</span>
                            <span class="value">${rent}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Looking For</span>
                            <span class="value">${gender}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-footer" style="justify-content: space-between;">
                 <span class="match-score" style="background: #e0f7fa; color: #006064;">${type === 'flat' ? 'My Room' : 'My Request'}</span>
                 <div class="listing-actions">
                    <button class="btn-edit-listing" data-id="${docId}" data-type="${type}" style="background: #e3f2fd; color: #1565c0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px;">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-delete-listing" data-id="${docId}" data-type="${type}" style="background: #ffcdd2; color: #c62828; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                 </div>
            </div>
        `;

        // Add Edit Event Listener
        const editBtn = card.querySelector('.btn-edit-listing');
        editBtn.addEventListener('click', () => {
            openEditModal(docId, data, type);
        });

        // Add Delete Event Listener
        const deleteBtn = card.querySelector('.btn-delete-listing');
        deleteBtn.addEventListener('click', async () => {
            const confirmed = await showConfirm("Are you sure you want to delete this listing? This action cannot be undone.");
            if (confirmed) {
                try {
                    // Delete photos from Nhost if it's a flat and has photos
                    if (type === 'flat' && data.photos && Array.isArray(data.photos)) {
                        console.log("Deleting photos for flat:", docId);
                        for (const photoUrl of data.photos) {
                            await deleteOldNhostFile(photoUrl);
                        }
                    }

                    const collectionName = type === 'flat' ? 'flats' : 'requirements';
                    await deleteDoc(doc(db, collectionName, docId));
                    card.remove();

                    // If no more cards, show empty message
                    if (listingsContainer.children.length === 0) {
                        listingsContainer.innerHTML = '<p style="text-align:center; width:100%;">No listings found.</p>';
                    }
                    showToast("Listing deleted successfully.", "success");
                } catch (error) {
                    console.error("Error deleting listing:", error);
                    showToast("Failed to delete listing.", "error");
                }
            }
        });

        listingsContainer.appendChild(card);
    }

    // --- Edit Modal Logic ---
    // (Variables moved to top scope)

    // Close Modals
    if (closeReqBtn) closeReqBtn.onclick = () => reqModal.classList.remove('active');
    if (closeRoomBtn) closeRoomBtn.onclick = () => roomModal.classList.remove('active');
    window.onclick = (e) => {
        if (e.target === reqModal) reqModal.classList.remove('active');
        if (e.target === roomModal) roomModal.classList.remove('active');
    };

    // Initialize UI Interactions (Toggles, Chips, Amenities)
    function initModalUI(modal) {
        // Toggles
        modal.querySelectorAll('.toggle-group').forEach(group => {
            group.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });

        // Chips
        modal.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => chip.classList.toggle('active'));
        });

        // Amenities
        modal.querySelectorAll('.amenity-item').forEach(item => {
            item.addEventListener('click', () => {
                const icon = item.querySelector('.amenity-icon');
                if (icon) icon.classList.toggle('active');
            });
        });

        // Upload Area Logic
        const uploadArea = modal.querySelector('.upload-area');
        const fileInput = modal.querySelector('input[type="file"]');
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', (e) => {
                // Prevent recursive click if bubbling
                if (e.target !== fileInput) {
                    fileInput.click();
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    // Check Limit
                    const activeExisting = currentEditPhotos.filter(url => !photosToDelete.has(url));
                    const currentCount = activeExisting.length + newPhotoFiles.length;
                    const filesToAdd = Array.from(fileInput.files);

                    if (currentCount + filesToAdd.length > 3) {
                        showToast(`You can only have up to 3 photos. Please remove some first.`, "error");
                        fileInput.value = ''; // Reset
                        return;
                    }

                    // Add to newPhotoFiles
                    filesToAdd.forEach(file => newPhotoFiles.push(file));

                    // Render
                    renderAllEditPhotos();

                    showToast(`${filesToAdd.length} new photo(s) selected`, "info");
                    fileInput.value = ''; // Reset to allow selecting same file again if needed or clean state
                }
            });
        }
    }

    if (reqModal) initModalUI(reqModal);
    if (roomModal) initModalUI(roomModal);

    // Google Maps Autocomplete for Edit Modals
    function initEditAutocomplete() {
        const reqInput = document.getElementById('reqLocation');
        const roomInput = document.getElementById('roomLocation');

        const checkGoogle = setInterval(() => {
            if (window.google && google.maps && google.maps.places) {
                clearInterval(checkGoogle);
                if (reqInput) {
                    new google.maps.places.Autocomplete(reqInput, {
                        types: ['(cities)'],
                        componentRestrictions: { country: 'in' }
                    });
                }
                if (roomInput) {
                    new google.maps.places.Autocomplete(roomInput, {
                        types: ['(cities)'],
                        componentRestrictions: { country: 'in' }
                    });
                }
            }
        }, 100);
    }
    initEditAutocomplete();


    // Track photos to delete and new photos to add
    let photosToDelete = new Set();
    let currentEditPhotos = []; // Existing URLs
    let newPhotoFiles = []; // New File objects

    function openEditModal(docId, data, type) {
        const modal = type === 'flat' ? roomModal : reqModal;
        const form = type === 'flat' ? roomForm : reqForm;

        if (!modal || !form) return;

        // Reset State
        photosToDelete.clear();
        currentEditPhotos = data.photos || [];
        newPhotoFiles = [];

        // Set Doc ID
        form.querySelector('input[name="docId"]').value = docId;

        // Populate Fields
        if (data.rent) form.querySelector('input[name="rent"]').value = data.rent;
        if (data.location) form.querySelector('input[name="location"]').value = data.location;

        // Smarter Population for Full Address
        const faInput = form.querySelector('input[name="fullAddress"]');
        if (faInput) {
            faInput.value = data.fullAddress || data.address || data.location || '';
        }

        if (data.description) form.querySelector('textarea[name="description"]').value = data.description;

        // Populate Toggles
        const setToggle = (groupName, value) => {
            const group = form.querySelector(`.toggle-group[data-group="${groupName}"]`);
            if (group && value) {
                group.querySelectorAll('.toggle-btn').forEach(btn => {
                    if (btn.dataset.value === value.toLowerCase()) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
        };

        setToggle('gender', data.gender);
        setToggle('occupancy', data.occupancy);
        // Deprecated fields removed

        // Populate Chips (Highlights/Preferences)
        const chipsContainer = form.querySelector('.chips-container');
        if (chipsContainer && data.highlights) {
            chipsContainer.querySelectorAll('.chip').forEach(chip => {
                if (data.highlights.includes(chip.innerText)) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
        }

        // Populate Amenities
        const amenitiesGrid = form.querySelector('.amenities-grid');
        if (amenitiesGrid && data.amenities) {
            amenitiesGrid.querySelectorAll('.amenity-item').forEach(item => {
                const icon = item.querySelector('.amenity-icon');
                const text = item.querySelector('span').innerText;
                if (data.amenities.includes(text)) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            });
        }

        // Show Photos (for Room)
        if (type === 'flat') {
            renderAllEditPhotos();
        }

        modal.classList.add('active');
    }

    // Unified Render Function
    function renderAllEditPhotos() {
        const existingPhotosDiv = document.getElementById('existingPhotos');
        const uploadArea = document.querySelector('.upload-area');
        if (!existingPhotosDiv) return;

        existingPhotosDiv.innerHTML = '';

        // Calculate total valid photos
        const activeExisting = currentEditPhotos.filter(url => !photosToDelete.has(url));
        const totalCount = activeExisting.length + newPhotoFiles.length;

        // 1. Render Existing Photos
        activeExisting.forEach(url => {
            const wrapper = createPhotoPreview(url, false, () => {
                photosToDelete.add(url);
                renderAllEditPhotos();
            });
            existingPhotosDiv.appendChild(wrapper);
        });

        // 2. Render New Photos
        newPhotoFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Check if this file is still in the array (async safety)
                if (newPhotoFiles[index] !== file) return;

                const wrapper = createPhotoPreview(e.target.result, true, () => {
                    newPhotoFiles.splice(index, 1);
                    renderAllEditPhotos();
                });
                // Find correct position? We just append, order might jitter slightly on re-render but fine.
                // Actually reader is async, so order isn't guaranteed unless we pre-read. 
                // For simplicity, we just append content. 
                // Better approach: Create wrapper immediately, set src later.
            }
            // Sync creation for order:
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = '60px';
            wrapper.style.height = '60px';
            wrapper.className = 'photo-preview-wrapper';

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.type = 'button';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '-5px';
            deleteBtn.style.right = '-5px';
            deleteBtn.style.background = '#e74c3c';
            deleteBtn.style.color = '#fff';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.width = '20px';
            deleteBtn.style.height = '20px';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.style.fontSize = '10px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.onclick = () => {
                newPhotoFiles.splice(index, 1);
                renderAllEditPhotos();
            };

            const img = document.createElement('img');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '2px solid #2ecc71'; // Green for new

            wrapper.appendChild(img);
            wrapper.appendChild(deleteBtn);
            existingPhotosDiv.appendChild(wrapper);

            const r = new FileReader();
            r.onload = (e) => img.src = e.target.result;
            r.readAsDataURL(file);
        });

        // 3. Handle Upload Area State
        // Note: The click listener is in initModalUI, we can't easily remove it. 
        // But we can check count inside the click handler or visually disable it.
        if (uploadArea) {
            if (totalCount >= 3) {
                uploadArea.classList.add('disabled'); // Add CSS for this?
                uploadArea.style.opacity = '0.5';
                uploadArea.style.pointerEvents = 'none';
                uploadArea.querySelector('p').innerText = "Limit Reached (3/3)";
            } else {
                uploadArea.classList.remove('disabled');
                uploadArea.style.opacity = '1';
                uploadArea.style.pointerEvents = 'auto';
                uploadArea.querySelector('p').innerHTML = 'Click or Drag Image to Upload<br><span>(JPG, JPEG, PNG)</span>';
            }
        }
    }

    function createPhotoPreview(src, isNew, onDelete) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '60px';
        wrapper.style.height = '60px';

        const img = document.createElement('img');
        img.src = src;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        if (isNew) img.style.border = '2px solid #2ecc71';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.type = 'button';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-5px';
        deleteBtn.style.right = '-5px';
        deleteBtn.style.background = '#e74c3c';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '20px';
        deleteBtn.style.height = '20px';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.style.cursor = 'pointer';

        deleteBtn.onclick = onDelete;

        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);
        return wrapper;
    }

    // Handle Form Submission (Update)
    const handleUpdate = async (e, type) => {
        e.preventDefault();
        const form = e.target;
        const docId = form.querySelector('input[name="docId"]').value;
        const collectionName = type === 'flat' ? 'flats' : 'requirements';
        const submitBtn = form.querySelector('.submit-btn');

        submitBtn.innerText = "Updating...";
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = {};

            // Collect Toggles
            form.querySelectorAll('.toggle-group').forEach(group => {
                const activeBtn = group.querySelector('.toggle-btn.active');
                if (activeBtn) data[group.dataset.group] = activeBtn.dataset.value;
            });

            // Collect Chips
            const chips = [];
            form.querySelectorAll('.chip.active').forEach(chip => chips.push(chip.innerText));
            data.highlights = chips;

            // Collect Amenities
            const amenities = [];
            form.querySelectorAll('.amenity-icon.active').forEach(icon => {
                amenities.push(icon.nextElementSibling.innerText);
            });
            data.amenities = amenities;

            // Collect Inputs
            const locationInput = form.querySelector('input[name="location"]');
            if (locationInput) data.location = locationInput.value;

            // Explicitly capture Full Address
            const faInput = form.querySelector('input[name="fullAddress"]');
            if (faInput) {
                data.fullAddress = faInput.value;
                // Also update legacy 'address' field to keep in sync
                data.address = faInput.value;
            }

            for (let [key, value] of formData.entries()) {
                if (key !== 'roomPhotos' && key !== 'docId' && key !== 'location' && key !== 'fullAddress') { // Skip special or already handled
                    data[key] = value;
                }
            }

            // Handle Photos (Update Room)
            if (type === 'flat') {
                // 1. Process Deletions
                for (const urlToDelete of photosToDelete) {
                    await deleteOldNhostFile(urlToDelete);
                }
                const remainingPhotos = currentEditPhotos.filter(url => !photosToDelete.has(url));

                // 2. Process New Uploads (Using newPhotoFiles array)
                const newImageUrls = [];
                if (newPhotoFiles.length > 0) {
                    const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
                    const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
                    const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

                    for (const file of newPhotoFiles) {
                        const fileName = `${currentUser.uid}/${Date.now()}_${file.name}`;
                        const fd = new FormData();
                        fd.append("bucket-id", "default");
                        fd.append("file[]", file, fileName);

                        const res = await fetch(uploadUrl, { method: 'POST', body: fd });
                        if (res.ok) {
                            const resData = await res.json();
                            const fileMetadata = resData.processedFiles?.[0] || resData;
                            newImageUrls.push(`https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`);
                        }
                    }
                }

                // 3. Final Photo List
                data.photos = [...remainingPhotos, ...newImageUrls];
            }

            await updateDoc(doc(db, collectionName, docId), data);
            showToast("Listing updated successfully!", "success");
            // Close Modal & Refresh
            if (type === 'flat') roomModal.classList.remove('active');
            else reqModal.classList.remove('active');

            loadUserListings(currentUser, currentUser.uid); // Refresh list

        } catch (error) {
            console.error("Error updating listing:", error);
            showToast("Failed to update listing.", "error");
        } finally {
            submitBtn.innerText = type === 'flat' ? "Update Room" : "Update Requirement";
            submitBtn.disabled = false;
        }
    };


    if (reqForm) reqForm.addEventListener('submit', (e) => handleUpdate(e, 'requirement'));
    if (roomForm) roomForm.addEventListener('submit', (e) => handleUpdate(e, 'flat'));


    // --- Preferences Edit/Save Logic ---
    const editPrefsBtn = document.getElementById('editPrefsBtn');
    const savePrefsBtn = document.getElementById('savePrefsBtn');
    const editPreferencesGrid = document.getElementById('editPreferencesGrid');

    if (editPrefsBtn && savePrefsBtn && editPreferencesGrid) {
        editPrefsBtn.addEventListener('click', async () => {
            // 1. Toggle UI
            editPrefsBtn.style.display = 'none';
            savePrefsBtn.style.display = 'block';
            preferencesGrid.style.display = 'none';
            editPreferencesGrid.style.display = 'grid';
            editPreferencesGrid.innerHTML = '';

            // 2. Fetch current prefs to mark selected
            let currentPrefs = [];
            if (currentUser) {
                const docSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (docSnap.exists()) {
                    currentPrefs = docSnap.data().preferences || [];
                }
            }

            // 3. Populate Edit Grid
            preferenceOptions.forEach(key => {
                const map = preferenceMap[key];
                // Check selection (support legacy)
                const legacyKey = key.replace(/-/g, '_');
                const isSelected = currentPrefs.includes(key) || currentPrefs.includes(legacyKey);

                const div = document.createElement('div');
                div.className = `pref-item ${isSelected ? 'selected' : ''}`;
                div.dataset.id = key;

                // Updated to use images
                div.innerHTML = `
                    <div class="icon-circle">
                         <img src="${map.image}" alt="${map.label}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                    </div>
                    <span class="pref-label">${map.label}</span>
                 `;

                // Toggle Selection on Click
                div.addEventListener('click', () => {
                    div.classList.toggle('selected');
                });

                editPreferencesGrid.appendChild(div);
            });
        });

        savePrefsBtn.addEventListener('click', async () => {
            const selectedItems = editPreferencesGrid.querySelectorAll('.pref-item.selected');
            const selectedIds = Array.from(selectedItems).map(item => item.dataset.id);

            if (selectedIds.length < 5) {
                showToast(`Please select at least 5 preferences. You have selected ${selectedIds.length}.`, "warning");
                return;
            }

            if (!currentUser) return;

            savePrefsBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    preferences: selectedIds
                });

                // Refresh View
                loadPreferences(selectedIds);

                // Reset UI
                editPrefsBtn.style.display = 'block';
                savePrefsBtn.style.display = 'none';
                savePrefsBtn.innerHTML = 'Save Changes <i class="fa-solid fa-check"></i>';

                preferencesGrid.style.display = 'grid';
                editPreferencesGrid.style.display = 'none';

                showToast("Preferences updated!", "success");

            } catch (error) {
                console.error("Error saving preferences:", error);
                showToast("Failed to save preferences.", "error");
                savePrefsBtn.innerHTML = 'Save Changes <i class="fa-solid fa-check"></i>';
            }
        });
    }

    // 5. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = '/index.html';
        });
    }

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Lightbox Logic (Updated to work with new Modal) ---
    // The lightbox is now separate. Clicking the avatar image itself (inside the wrapper) should trigger the lightbox.
    // But wait, the wrapper now contains the camera icon button which is absolute.
    // The image itself should still be clickable for lightbox.

    const lightboxModal = document.getElementById('avatarLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeLightbox = document.querySelector('.close-lightbox');

    if (profileAvatarEl && lightboxModal && lightboxImg) {
        profileAvatarEl.addEventListener('click', () => {
            lightboxModal.style.display = "flex";
            lightboxImg.src = profileAvatarEl.src;
        });
    }

    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            lightboxModal.style.display = "none";
        });
    }
});
