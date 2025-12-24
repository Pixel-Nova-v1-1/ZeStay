import { auth, db } from "../firebase";
import { nhost } from "../nhost";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

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
                const navProfileBtn = document.querySelector('.btn-profile');
                if (navProfileBtn) {
                    const navImg = document.createElement('img');
                    navImg.src = data.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.name || 'User'}`;
                    navImg.style.width = '35px';
                    navImg.style.height = '35px';
                    navImg.style.borderRadius = '50%';
                    navImg.style.objectFit = 'cover';
                    navProfileBtn.innerHTML = '';
                    navProfileBtn.appendChild(navImg);
                }

                document.getElementById('display-name').value = data.name || "";
                document.getElementById('display-email').value = data.email || "";
                document.getElementById('display-occupation').value = data.occupation || "";
                document.getElementById('display-dob').value = data.dob || "";
                document.getElementById('display-hobbies').value = data.hobbies || "";

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
                    return downloadURL;
                };

                // Race them
                const downloadURL = await Promise.race([uploadTask(), timeoutPromise]);

                // Update UI
                profileAvatarEl.src = downloadURL;
                console.log("Profile updated successfully");

            } catch (error) {
                console.error("Error uploading avatar:", error);
                alert("Failed to upload avatar: " + error.message);
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
            if (!confirm("Are you sure you want to remove your profile photo?")) return;

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

                // Update UI
                profileAvatarEl.src = defaultAvatar;
                profileUploadModal.style.display = 'none';
                alert("Profile photo removed.");

            } catch (error) {
                console.error("Error removing photo:", error);
                alert("Failed to remove photo.");
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

                // Update UI
                profileAvatarEl.src = selectedUrl;
                profileUploadModal.style.display = 'none';

            } catch (error) {
                console.error("Error updating avatar:", error);
                alert("Failed to update avatar.");
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
        });

        saveProfileBtn.addEventListener('click', async () => {
            if (!currentUser) return;

            saveProfileBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

            const newName = document.getElementById('display-name').value;
            const newOccupation = document.getElementById('display-occupation').value;
            const activeGenderEl = genderPillDisplay.querySelector('.active');
            const newGender = activeGenderEl ? activeGenderEl.textContent : 'Male';

            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    name: newName,
                    occupation: newOccupation,
                    gender: newGender,
                    dob: document.getElementById('display-dob').value,
                    hobbies: document.getElementById('display-hobbies').value
                });

                profileNameEl.textContent = newName;
                alert("Profile updated!");

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

            } catch (error) {
                console.error("Error saving profile:", error);
                alert("Failed to save profile.");
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

    function renderListingCard(docId, data, type) {
        const avatar = data.userPhoto || (currentUser ? currentUser.photoURL : 'https://api.dicebear.com/9.x/avataaars/svg?seed=User');
        const location = data.location || 'Location not specified';
        const rent = data.rent ? `₹ ${data.rent}` : 'Rent not specified';
        const typeLabel = type === 'flat' ? 'Room/Flat' : 'Roommate Requirement';
        const gender = data.gender || 'Any';

        const card = document.createElement('div');
        card.className = 'listing-card';
        card.style.maxWidth = '600px'; // Increased size
        card.style.margin = '10px auto';
        card.style.position = 'relative';

        card.innerHTML = `
            <div class="card-content">
                <div class="card-avatar">
                   <img src="${avatar}" alt="Avatar">
                </div>
                <div class="card-details">
                    <h3>${typeLabel}</h3>
                    <p class="location"><i class="fa-solid fa-location-dot"></i> ${location}</p>
                    
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
            if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
                try {
                    const collectionName = type === 'flat' ? 'flats' : 'requirements';
                    await deleteDoc(doc(db, collectionName, docId));
                    card.remove();
                    
                    // If no more cards, show empty message
                    if (listingsContainer.children.length === 0) {
                        listingsContainer.innerHTML = '<p style="text-align:center; width:100%;">No listings found.</p>';
                    }
                    
                    alert("Listing deleted successfully.");
                } catch (error) {
                    console.error("Error deleting listing:", error);
                    alert("Failed to delete listing.");
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


    function openEditModal(docId, data, type) {
        const modal = type === 'flat' ? roomModal : reqModal;
        const form = type === 'flat' ? roomForm : reqForm;
        
        if (!modal || !form) return;

        // Set Doc ID
        form.querySelector('input[name="docId"]').value = docId;

        // Populate Fields
        if (data.rent) form.querySelector('input[name="rent"]').value = data.rent;
        if (data.location) form.querySelector('input[name="location"]').value = data.location;
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
        setToggle('pg', data.pg);
        setToggle('teams', data.teams);
        setToggle('contact', data.contact);

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

        // Show Existing Photos (for Room)
        if (type === 'flat' && data.photos) {
            const existingPhotosDiv = document.getElementById('existingPhotos');
            if (existingPhotosDiv) {
                existingPhotosDiv.innerHTML = data.photos.map(url => 
                    `<img src="${url}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">`
                ).join('');
            }
        }

        modal.classList.add('active');
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
            for (let [key, value] of formData.entries()) {
                if (key !== 'roomPhotos' && key !== 'docId') {
                    data[key] = value;
                }
            }

            // Handle Photo Upload (New Photos)
            // Note: This implementation appends new photos. Deleting old ones is not implemented in this simple version.
            const fileInput = form.querySelector('input[type="file"]');
            if (fileInput && fileInput.files.length > 0) {
                const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
                const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
                const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;
                
                const newImageUrls = [];
                for (const file of fileInput.files) {
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
                
                // Fetch existing photos to append
                const docSnap = await getDoc(doc(db, collectionName, docId));
                const existingPhotos = docSnap.data().photos || [];
                data.photos = [...existingPhotos, ...newImageUrls];
            }

            await updateDoc(doc(db, collectionName, docId), data);
            
            alert("Listing updated successfully!");
            
            // Close Modal & Refresh
            if (type === 'flat') roomModal.classList.remove('active');
            else reqModal.classList.remove('active');
            
            loadUserListings(currentUser, currentUser.uid); // Refresh list

        } catch (error) {
            console.error("Error updating listing:", error);
            alert("Failed to update listing.");
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
                alert(`Please select at least 5 preferences. You have selected ${selectedIds.length}.`);
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

                alert("Preferences updated!");

            } catch (error) {
                console.error("Error saving preferences:", error);
                alert("Failed to save preferences.");
                savePrefsBtn.innerHTML = 'Save Changes <i class="fa-solid fa-check"></i>';
            }
        });
    }

    // 5. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'index.html';
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
