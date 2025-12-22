
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
    const inputs = document.querySelectorAll('.profile-details-form input');
    const genderPillDisplay = document.getElementById('display-gender');
    let isEditing = false;


    const preferenceMap = {
        'night-owl': { label: 'Night Owl', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842878392242309/1.png?ex=6947a58c&is=6946540c&hm=4beaa2241099fade45cc8db362da8dab01c34f66fe51eee157d6179bc41d956b&=&format=webp&quality=lossless&width=813&height=813' },
        'early-bird': { label: 'Early Bird', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842877566095521/2.png?ex=6947a58b&is=6946540b&hm=4eefa0218a3d0c48f5219543083593a8ccf22a9c23908cea4ca9207b6b63298c&=&format=webp&quality=lossless&width=813&height=813' },
        'music-lover': { label: 'Music Lover', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842876764979373/3.png?ex=6947a58b&is=6946540b&hm=2e57e6525773c585c332b6c2b7c712e736d1dc4dcf9d0e037d9a084bcde923b0&=&format=webp&quality=lossless&width=813&height=813' },
        'quiet-seeker': { label: 'Quiet Seeker', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842875880112282/4.png?ex=6947a58b&is=6946540b&hm=a48f35e7b922f190832469503d3297d32fc1cbe662af54b81e1324ae3a7d8a29&=&format=webp&quality=lossless&width=813&height=813' },
        'pet-lover': { label: 'Pet Lover', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842874877677628/5.png?ex=6947a58b&is=6946540b&hm=e3f121878387af876f317ad49a28448f624119b324538a31ed699b91ea374417&=&format=webp&quality=lossless&width=813&height=813' },
        'studious': { label: 'Studious', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842867218874500/6.png?ex=6947a589&is=69465409&hm=367bc3ede70cef222877705958cfcfaa899ec5bcec94312dc96c746b89e5c211&=&format=webp&quality=lossless&width=813&height=813' },
        'sporty': { label: 'Sporty', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842866501521469/7.png?ex=6947a589&is=69465409&hm=b5d5751857454bee6c4d7b2f2588b6db7b2e09b534eb20a989db8656698caf90&=&format=webp&quality=lossless&width=813&height=813' },
        'guest-friendly': { label: 'Guest Friendly', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842865788616824/8.png?ex=6947a589&is=69465409&hm=2b211f2b7f2753156273fffe44f119b8381d9f93dbea5f357d99ae8914189e87&=&format=webp&quality=lossless&width=813&height=813' },
        'wanderer': { label: 'Wanderer', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842865184641186/9.png?ex=6947a588&is=69465408&hm=700bdeb38db6608322e166b5c9082b9969bf0572c6c96c677bd23dac4bb4a466&=&format=webp&quality=lossless&width=813&height=813' },
        'clean-centric': { label: 'Clean centric', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842864391655454/10.png?ex=6947a588&is=69465408&hm=a0b8956aa9787ce2ac68f47c11d54c5088c9bfec2e5b7038d243dc58856d0d86&=&format=webp&quality=lossless&width=813&height=813' },
        'non-alcoholic': { label: 'Non-alcoholic', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842886642438155/11.png?ex=6947a58e&is=6946540e&hm=193067eb44a6bfdeab2c90572ca381eb3ffa7dd6eb0176e069827f5fa07ee152&=&format=webp&quality=lossless&width=813&height=813' },
        'non-smoker': { label: 'Non-smoker', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842885996773417/12.png?ex=6947a58d&is=6946540d&hm=f6bdb9d69c407be0a9abe0ea66b4ab3def35790ca12acec6b4161fd51824ef63&=&format=webp&quality=lossless&width=813&height=813' }
    };


    const avatarUploadInput = document.getElementById('avatarUploadInput');

    function loadUserProfile() {
        const storedProfile = localStorage.getItem('userProfile');

        if (storedProfile) {
            const data = JSON.parse(storedProfile);
            /* 
               --- BACKEND INTEGRATION NOTE ---
               Replace the localStorage fetching below with API calls.
               
               // Load User Profile
               fetch('/api/user/profile')
                   .then(res => res.json())
                   .then(data => {
                       profileNameEl.textContent = data.name;
                       // ... other fields
                   });
                   **for devjith
            */
            if (data.name) {
                let nameHtml = data.name;
                if (localStorage.getItem('isVerified') === 'true') {
                    // Blue Verified Badge (FontAwesome Stack) - Slightly larger for profile page
                    nameHtml += `
                    <span class="fa-stack" style="font-size: 10px; margin-left: 8px; vertical-align: middle;">
                        <i class="fa-solid fa-certificate fa-stack-2x" style="color: #2196F3;"></i>
                        <i class="fa-solid fa-check fa-stack-1x" style="color: white;"></i>
                    </span>`;
                }
                profileNameEl.innerHTML = nameHtml;
                document.getElementById('display-name').value = data.name; /* New Field */
            }
            if (data.email) {
                // profileEmailEl.textContent = data.email; // Removed
                document.getElementById('display-email').value = data.email; /* New Field */
            }
            if (data.occupation) {
                document.getElementById('display-occupation').value = data.occupation; /* New Field */
            }
            if (data.gender) {
                const genderContainer = document.getElementById('display-gender');
                // clear first or reconstruct
                genderContainer.innerHTML = `
                    <span class="gender-option ${data.gender === 'Male' ? 'active' : ''}">Male</span>
                    <span class="gender-option ${data.gender === 'Female' ? 'active' : ''}">Female</span>
                `;
            }

            if (data.profileOption === 'upload' && data.uploadedAvatar) {

                profileAvatarEl.src = data.uploadedAvatar;
            } else if (data.profileOption === 'avatar' && data.avatarId) {
                if (!data.avatarId.startsWith('http')) {
                    profileAvatarEl.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.avatarId}`;
                } else {
                    profileAvatarEl.src = data.avatarId;
                }
            } else {

                profileAvatarEl.src = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';
            }

        } else {

            profileNameEl.textContent = "Guest User";

        }
    }


    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = function (event) {
                const base64String = event.target.result;

                profileAvatarEl.src = base64String;


                const storedProfile = localStorage.getItem('userProfile');
                let data = {};
                if (storedProfile) {
                    data = JSON.parse(storedProfile);
                }


                data.profileOption = 'upload';
                data.uploadedAvatar = base64String;

                localStorage.setItem('userProfile', JSON.stringify(data));
            };

            reader.readAsDataURL(file);
        });
    }

    function loadPreferences() {
        const storedPrefs = localStorage.getItem('userPreferences');
        preferencesGrid.innerHTML = '';

        if (storedPrefs) {
            const data = JSON.parse(storedPrefs);
            const prefIds = data.preferences || [];

            if (prefIds.length > 0) {
                prefIds.forEach(id => {
                    const map = preferenceMap[id];
                    if (map) {
                        const div = document.createElement('div');
                        div.className = 'pref-item-display';
                        div.innerHTML = `
                            <div class="pref-icon-circle teal">
                                <img src="${map.image}" alt="${map.label}">
                            </div>
                            <span class="pref-label">${map.label}</span>
                         `;
                        preferencesGrid.appendChild(div);
                    }
                });
            } else {
                preferencesGrid.innerHTML = '<p class="empty-state">No preferences selected.</p>';
            }
        } else {
            preferencesGrid.innerHTML = '<p class="empty-state">No preferences found. Please complete the questionnaire.</p>';
        }
    }

    function loadListings() {
        const storedListings = localStorage.getItem('userListings');

        listingsContainer.innerHTML = '';

        if (storedListings) {
            const listings = JSON.parse(storedListings);

            if (listings.length > 0) {
                listings.forEach(item => {
                    const rent = item.rent || item['Approx Rent'] || '₹ 5,000';
                    const location = item.location || item['Location'] || 'Unknown Location';
                    const lookingFor = item.gender || item.lookingFor || 'Any';
                    const matchScore = 'New';
                    const distance = '0 km';

                    const image = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&w=400&q=80';

                    let interestsHTML = '';
                    if (item.highlights_preferences) {
                        const interests = item.highlights_preferences.split(', ').slice(0, 3); // Show max 3
                        interestsHTML = interests.map(interest => `<span style="background: #e0f2f1; color: #009688; padding: 4px 8px; border-radius: 12px; font-size: 0.75em; margin-right: 5px;">${interest}</span>`).join('');
                    }

                    const card = document.createElement('div');
                    card.className = 'listing-card';
                    card.innerHTML = `
                        <div class="card-content">
                            <div class="card-top">
                                <div class="listing-avatar">
                                    <img src="${image}" alt="Listing">
                                </div>
                                <div class="listing-info">
                                    <h3>${profileNameEl.textContent || 'My Listing'}</h3>
                                    <p class="listing-location"><i class="fa-solid fa-location-dot"></i> ${location}</p>
                                    
                                    <div class="info-row">
                                        <div class="info-col">
                                            <span class="label">Rent</span>
                                            <span class="value">₹ ${rent}</span>
                                        </div>
                                        <div class="info-col">
                                            <span class="label">Looking for</span>
                                            <span class="value" style="text-transform: capitalize;">${lookingFor}</span>
                                        </div>
                                    </div>
                                     <div style="margin-top: 10px; display: flex; flex-wrap: wrap;">
                                        ${interestsHTML}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-bottom">
                            <div class="match-tag">
                                <span>${matchScore}</span>
                            </div>
                            <span style="font-size: 13px; color: #555;">${distance} away</span>
                            <div class="phone-icon"><i class="fa-solid fa-phone"></i></div>
                        </div>
                    `;
                    listingsContainer.appendChild(card);
                });
            } else {
                listingsContainer.innerHTML = '<p class="empty-state">No listings found.</p>';
            }
        } else {
            listingsContainer.innerHTML = '<p class="empty-state">You haven\'t posted any listings yet.</p>';
        }
    }


    function loadNotifications() {
        const notificationsContainer = document.getElementById('notificationsContainer');
        /* 
           --- BACKEND INTEGRATION NOTE ---
           Replace the logic below with an API call to fetch notifications.
           
           fetch('/api/user/notifications')
               .then(res => res.json())
               .then(data => {
                   if (data.length > 0) {
                       notificationsContainer.innerHTML = ''; // Clear empty state
                       
                       data.forEach(notif => {
                           // Example Render Logic:
                           // const item = document.createElement('div');
                           // item.className = `notification-item ${notif.isRead ? '' : 'unread'}`;
                           // item.innerHTML = `
                           //    <div class="notif-icon-circle"><i class="fa-regular fa-user"></i></div>
                           //    <div class="notif-content">
                           //        <h4>${notif.senderName}</h4>
                           //        <p>${notif.message}</p>
                           //        <span class="notif-date">${notif.date}</span>
                           //    </div>
                           //    <div class="notif-time">${notif.time}</div>
                           //    ${!notif.isRead ? '<div class="notif-dot"></div>' : ''}
                           // `;
                           // notificationsContainer.appendChild(item);
                       });
                   }
               });
        */

        // For now, we keep the default content from HTML (Empty State)
        // because there are no backend notifications yet.
        //****for devjith 
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 5. Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Logout Logic
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('isVerified'); // Clear verification status
            window.location.href = 'index.html';
        });
    }



    if (editProfileBtn && saveProfileBtn) {
        // Edit Button Click
        editProfileBtn.addEventListener('click', () => {
            isEditing = true;
            // Toggle UI
            editProfileBtn.style.display = 'none';
            saveProfileBtn.style.display = 'block'; // Or inline-flex if needed, styling handles it

            // Enable inputs
            inputs.forEach(input => {
                input.removeAttribute('readonly');
                input.style.backgroundColor = '#fff'; // Visual cue
                input.style.borderColor = '#1abc9c';
            });

            // Enable Gender Selection Visuals
            genderPillDisplay.classList.add('editing');
        });

        // Save Button Click
        saveProfileBtn.addEventListener('click', () => {
            isEditing = false;

            // 1. Gather Data
            const newName = document.getElementById('display-name').value;
            const newOccupation = document.getElementById('display-occupation').value;
            const newEmail = document.getElementById('display-email').value;
            // Gender is handled by active class check below
            const activeGenderEl = genderPillDisplay.querySelector('.active');
            const newGender = activeGenderEl ? activeGenderEl.textContent : 'Male'; // Default fallback

            // 2. Update LocalStorage
            const storedProfile = localStorage.getItem('userProfile');
            let data = storedProfile ? JSON.parse(storedProfile) : {};

            data.name = newName;
            data.occupation = newOccupation;
            data.email = newEmail;
            data.gender = newGender;

            localStorage.setItem('userProfile', JSON.stringify(data));

            // 3. Update UI to Read-Only
            editProfileBtn.style.display = 'block'; // or inline-flex
            saveProfileBtn.style.display = 'none';

            inputs.forEach(input => {
                input.setAttribute('readonly', true);
                input.style.backgroundColor = '#f1f2f6';
                input.style.borderColor = 'transparent';
            });

            genderPillDisplay.classList.remove('editing');

            // Update Header Name immediately
            profileNameEl.textContent = newName;

            alert('Profile Updated Successfully!');
        });
    }

    // Gender Selection Logic (Delegation)
    if (genderPillDisplay) {
        genderPillDisplay.addEventListener('click', (e) => {
            if (!isEditing) return; // Only allow change if editing

            if (e.target.classList.contains('gender-option')) {
                // Remove active from all
                const options = genderPillDisplay.querySelectorAll('.gender-option');
                options.forEach(opt => opt.classList.remove('active'));

                // Add active to clicked
                e.target.classList.add('active');
            }
        });
    }


    // --- Preferences Edit/Save Logic ---
    const editPrefsBtn = document.getElementById('editPrefsBtn');
    const savePrefsBtn = document.getElementById('savePrefsBtn');
    const userPreferencesGrid = document.getElementById('userPreferencesGrid');
    const editPreferencesGrid = document.getElementById('editPreferencesGrid');

    if (editPrefsBtn && savePrefsBtn && editPreferencesGrid) {

        editPrefsBtn.addEventListener('click', () => {
            // 1. Toggle Buttons
            editPrefsBtn.style.display = 'none';
            savePrefsBtn.style.display = 'block'; // or inline-flex

            // 2. Toggle Grids
            userPreferencesGrid.style.display = 'none';
            editPreferencesGrid.style.display = 'grid'; // Ensure grid layout
            editPreferencesGrid.innerHTML = ''; // Clear previous

            // 3. Get Current Prefs
            const storedPrefs = localStorage.getItem('userPreferences');
            let currentPrefIds = [];
            if (storedPrefs) {
                const data = JSON.parse(storedPrefs);
                currentPrefIds = data.preferences || [];
            }

            // 4. Populate Edit Grid with ALL Options
            Object.keys(preferenceMap).forEach(key => {
                const map = preferenceMap[key];
                const isSelected = currentPrefIds.includes(key);

                const div = document.createElement('div');
                div.className = `pref-item ${isSelected ? 'selected' : ''}`;
                div.dataset.id = key;
                div.innerHTML = `
                    <div class="icon-circle">
                         <img src="${map.image}" alt="${map.label}">
                    </div>
                    <span class="pref-label">${map.label}</span>
                 `;

                // Selection Click Handler
                div.addEventListener('click', () => {
                    div.classList.toggle('selected');
                });

                editPreferencesGrid.appendChild(div);
            });
        });

        savePrefsBtn.addEventListener('click', () => {
            // 1. Gather Selected IDs
            const selectedItems = editPreferencesGrid.querySelectorAll('.pref-item.selected');
            const selectedIds = Array.from(selectedItems).map(item => item.dataset.id);

            // Validation (Optional: currently "at least 5" mentioned in HTML, enforcing here?)
            if (selectedIds.length < 5) {
                alert('Please select at least 5 preferences.');
                return;
            }

            // 2. Update LocalStorage
            const storedPrefs = localStorage.getItem('userPreferences');
            let data = storedPrefs ? JSON.parse(storedPrefs) : {};
            data.preferences = selectedIds;
            localStorage.setItem('userPreferences', JSON.stringify(data));

            // 3. Refresh Display Grid
            loadPreferences();

            // 4. Toggle UI Back
            editPrefsBtn.style.display = 'block'; // or inline-flex
            savePrefsBtn.style.display = 'none';

            userPreferencesGrid.style.display = ''; // Restore display (let CSS handle it)
            editPreferencesGrid.style.display = 'none';

            alert('Preferences Updated Successfully!');
        });
    }


    // --- Lightbox Logic ---
    const lightbox = document.getElementById('avatarLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeBtn = document.querySelector('.close-lightbox');

    if (profileAvatarEl && lightbox && lightboxImg) {
        profileAvatarEl.addEventListener('click', () => {
            lightbox.style.display = "flex";
            lightbox.style.display = "block";
            lightboxImg.src = profileAvatarEl.src;
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            lightbox.style.display = "none";
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = "none";
            }
        });
    }


    // Initialize
    loadUserProfile();
    loadPreferences();
    loadListings();
    loadNotifications();

});
