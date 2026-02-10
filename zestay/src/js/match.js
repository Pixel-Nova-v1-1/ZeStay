import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { showToast } from "./toast.js";

console.log("match.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    let allUsers = [];
    let flatsData = [];

    let currentType = 'Roommates';
    let currentFilter = 'Any';
    let currentIndex = 0;
    const itemsPerPage = 10; // Increased for better UX

    const container = document.querySelector('.listings-container');
    const moreBtn = document.querySelector('.bhagwan');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const dropdownButton = document.querySelector('.filter-dropdown');
    const dropdownItems = document.querySelectorAll('.dropdown-content a');
    const searchInput = document.getElementById('matchSearchInput');

    // Global User State
    let currentUser = null;
    let currentUserData = null;

    // --- Auth Logic (Firebase) ---
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const logoutBtn = document.getElementById('logoutBtn');
        const matchProfileBtn = document.getElementById('matchProfileBtn');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';
                if (docSnap.exists()) {
                    currentUserData = docSnap.data();
                    imgSrc = currentUserData.photoUrl || imgSrc;

                    // Fetch matches after getting current user data
                    if (currentType === 'Flats') {
                        await fetchFlats();
                    } else {
                        await fetchMatches();
                    }
                }

                if (matchProfileBtn) {
                    matchProfileBtn.innerHTML = `<img src="${imgSrc}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:2px solid white;">`;
                    matchProfileBtn.onclick = () => {
                        window.location.href = 'profile.html';
                    };
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }

            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await signOut(auth);
                    window.location.reload();
                };
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';

            // Redirect to login if not authenticated
            window.location.href = 'regimob.html?mode=login';
        }
    });

    async function fetchMatches() {
        if (!currentUser || !currentUserData) return;

        container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Finding your best matches...</p>';

        try {
            // Fetch from 'requirements' collection instead of 'users'
            const querySnapshot = await getDocs(collection(db, "requirements"));

            const matchesPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const reqData = docSnapshot.data();
                const reqId = docSnapshot.id;

                // Skip if it's the current user's own requirement
                if (reqData.userId === currentUser.uid) return null;

                let userData = {};
                let matchScore = 0;

                if (reqData.userId) {
                    try {
                        // Check if we already have this user in allUsers (optimization)
                        // Note: allUsers is now being used to store the final list of matches (requirements + user data)
                        // So we can't check it for cached users in the same way. 
                        // But we can check if we've already fetched this user for another requirement if we had a cache.
                        // For now, let's just fetch.

                        const userDocRef = doc(db, "users", reqData.userId);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            userData = userDocSnap.data();
                            // Calculate match score based on User Profiles (Personality + Preferences)
                            // We could also use reqData.preferences if we wanted to match against specific requirement preferences
                            matchScore = calculateMatchScore(currentUserData, userData);
                        }
                    } catch (err) {
                        console.error("Error fetching user for requirement:", err);
                    }
                }

                return {
                    id: reqId, // Requirement ID
                    ...reqData, // Requirement Data (rent, location, etc.)
                    userName: userData.name || 'User',
                    userPhoto: userData.photoUrl || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + (reqData.userId || 'User'),
                    userGender: userData.gender || 'N/A',
                    userPreferences: userData.preferences || [], // For tooltip
                    userHobbies: userData.hobbies || [], // For tooltip
                    isVerified: userData.isVerified || false,
                    userRole: userData.role || 'USER', // Add Role
                    matchScore: matchScore
                };
            });

            const matches = (await Promise.all(matchesPromises)).filter(m => m !== null);

            // Sort by match score descending
            matches.sort((a, b) => b.matchScore - a.matchScore);
            allUsers = matches;

            if (currentType === 'Roommates') {
                init();
            }

        } catch (error) {
            console.error("Error fetching matches:", error);
            container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Error loading matches.</p>';
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    async function fetchFlats() {
        if (flatsData.length > 0) {
            if (currentType === 'Flats') init();
            return;
        }

        container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Loading flats...</p>';

        try {
            const querySnapshot = await getDocs(collection(db, "flats"));

            // Fetch user details for each flat to calculate match score and show profile
            const flatPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const flatData = docSnapshot.data();
                const flatId = docSnapshot.id;

                if (currentUser && flatData.userId === currentUser.uid) return null;

                let ownerData = {};
                let matchScore = 0;

                if (flatData.userId) {
                    try {
                        // Check if we already have this user in allUsers (optimization)
                        const existingUser = allUsers.find(u => u.id === flatData.userId);
                        if (existingUser) {
                            ownerData = existingUser;
                            matchScore = existingUser.matchScore;
                        } else {
                            // Fetch user if not in allUsers
                            if (currentUser && flatData.userId === currentUser.uid) {
                                ownerData = currentUserData;
                                matchScore = 100;
                            } else {
                                const userDocRef = doc(db, "users", flatData.userId);
                                const userDocSnap = await getDoc(userDocRef);
                                if (userDocSnap.exists()) {
                                    ownerData = userDocSnap.data();
                                    if (currentUserData) {
                                        matchScore = calculateMatchScore(currentUserData, ownerData);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching flat owner:", err);
                    }
                }

                return {
                    id: flatId,
                    ...flatData,
                    ownerName: ownerData.name || 'User',
                    ownerPhoto: ownerData.photoUrl || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + (flatData.userId || 'User'),
                    isVerified: ownerData.isVerified || false,
                    ownerRole: ownerData.role || 'USER', // Add Role
                    matchScore: matchScore
                };
            });

            const flats = (await Promise.all(flatPromises)).filter(f => f !== null);

            // Sort by match score descending
            flats.sort((a, b) => b.matchScore - a.matchScore);

            flatsData = flats;

            if (currentType === 'Flats') {
                init();
            }
        } catch (error) {
            console.error("Error fetching flats:", error);
            if (currentType === 'Flats') {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Error loading flats.</p>';
            }
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    function calculateMatchScore(user1, user2) {
        // 1. Personality Score (33%)
        // Max difference approx 20 (5 questions * 4 max diff). 
        const s1 = user1.personalityScore || 0;
        const s2 = user2.personalityScore || 0;
        const diff = Math.abs(s1 - s2);
        // Normalize: 0 diff = 100%, 20 diff = 0%
        // Boosted: Less penalty for differences (was * 5)
        let personalityMatch = Math.max(0, 100 - (diff * 2));

        // 2. Preferences Match (33%)
        const p1 = user1.preferences || [];
        const p2 = user2.preferences || [];

        let prefMatch = 0;
        if (p1.length > 0) {
            const shared = p1.filter(p => p2.includes(p));
            // Boosted: Add base score of 30
            prefMatch = Math.min(100, (shared.length / Math.max(p1.length, 1)) * 100 + 30);
        } else {
            // Boosted: Default score if no preferences (was 0)
            prefMatch = 60;
        }

        // 3. Hobbies Match (33%)
        let h1 = user1.hobbies || [];
        let h2 = user2.hobbies || [];

        // Normalize to array if string
        if (typeof h1 === 'string') h1 = h1.split(',').map(s => s.trim().toLowerCase());
        if (typeof h2 === 'string') h2 = h2.split(',').map(s => s.trim().toLowerCase());

        // Ensure arrays
        if (!Array.isArray(h1)) h1 = [];
        if (!Array.isArray(h2)) h2 = [];

        let hobbiesMatch = 0;
        if (h1.length > 0) {
            // Case insensitive comparison
            const h2Lower = h2.map(h => h.toLowerCase());
            const sharedHobbies = h1.filter(h => h2Lower.includes(h.toLowerCase()));
            // Boosted: Add base score of 30
            hobbiesMatch = Math.min(100, (sharedHobbies.length / Math.max(h1.length, 1)) * 100 + 30);
        } else {
            // Boosted: Default score if no hobbies (was 0)
            hobbiesMatch = 60;
        }

        // Weighted Average (33% each)
        let finalScore = (personalityMatch + prefMatch + hobbiesMatch) / 3;

        // Final Boost: Add 15 points to everything
        finalScore = Math.min(100, finalScore + 15);

        return Math.round(finalScore);
    }

    function getCardHTML(item, type, index = 0) {
        const delay = index * 0.1;
        const style = `style="animation-delay: ${delay}s"`;
        // Store type and ID in data attributes for delegation
        const dataAttrs = `data-id="${item.id}" data-type="${type}"`;

        const verifiedIcon = item.isVerified ? '<i class="fa-solid fa-circle-check" style="color: #4CAF50; margin-left: 5px;"></i>' : '';
        const pgIcon = (item.userRole === 'PG_OWNER' || item.ownerRole === 'PG_OWNER') ? '<i class="fa-solid fa-building-user" style="color: #FFD700; margin-left: 5px;" title="PG Owner"></i>' : '';

        if (type === 'Roommates') {

            let interestsHTML = '';
            // Use preferences from User Data (fetched in fetchMatches)
            const interests = item.userPreferences || [];
            // Also add hobbies if available
            let hobbies = [];
            if (item.hobbies) {
                if (Array.isArray(item.hobbies)) hobbies = item.hobbies;
                else hobbies = item.hobbies.split(',').map(s => s.trim());
            }

            // Combine and take top 5
            const allInterests = [...interests, ...hobbies].slice(0, 5);

            if (allInterests.length > 0) {
                interestsHTML = allInterests.map(interest => `<span class="interest-tag">${interest.replace(/-/g, ' ')}</span>`).join('');
                if (allInterests.length >= 5) {
                    interestsHTML += `<span class="interest-tag view-more" style="background: transparent;">View More</span>`;
                }
            }

            const avatar = item.userPhoto || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + (item.userName || 'User');
            const location = item.location || 'Location not specified';
            const address = item.address ? item.address + ', ' : '';
            const rent = item.rent ? `₹ ${item.rent}` : 'Rent not specified';
            const lookingFor = item.gender ? `Gender: ${item.gender}` : 'Any'; // Displaying Gender as "Looking For" context is ambiguous in UI, but let's show Gender.

            return `
            <div class="listing-card" ${style} ${dataAttrs} style="cursor: pointer;">
                <div class="card-content">
                    <div class="card-avatar">
                       <img src="${avatar}" alt="Avatar">
                    </div>
                    <div class="card-details">
                        <h3>${item.userName || 'User'}${verifiedIcon}${pgIcon}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${address}${location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Looking For</span>
                                <span class="value">${item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : 'Any'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="match-wrapper">
                        <span class="match-score">${item.matchScore}% match!</span>
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Common Interests</div>
                            <div class="interests-grid">
                                ${interestsHTML}
                            </div>
                        </div>
                    </div>
                    <button class="btn-contact"><i class="fa-solid fa-message"></i></button>
                </div>
            </div>`;
        } else if (type === 'Flats') {
            const avatar = item.ownerPhoto || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + item.id;
            const location = item.location || 'Location not specified';
            const bestAddress = item.fullAddress || item.address;
            const address = bestAddress ? bestAddress + ', ' : '';
            const rent = item.rent ? `₹ ${item.rent}` : 'Rent not specified';
            const occupancy = item.occupancy || 'Any';

            // Amenities Logic
            const amenities = item.amenities || [];
            let amenitiesHTML = '';

            if (amenities.length > 0) {
                amenitiesHTML = amenities.slice(0, 5).map(am => {
                    let icon = '';
                    const lower = am.toLowerCase();
                    if (lower.includes('wifi')) icon = '<i class="fa-solid fa-wifi"></i> ';
                    else if (lower.includes('wash')) icon = '<i class="fa-solid fa-shirt"></i> ';
                    else if (lower.includes('ac') || lower.includes('air')) icon = '<i class="fa-solid fa-wind"></i> ';
                    else if (lower.includes('tv')) icon = '<i class="fa-solid fa-tv"></i> ';
                    else if (lower.includes('park')) icon = '<i class="fa-solid fa-car"></i> ';
                    else if (lower.includes('lift')) icon = '<i class="fa-solid fa-elevator"></i> ';
                    else if (lower.includes('power')) icon = '<i class="fa-solid fa-battery-full"></i> ';
                    else if (lower.includes('gym')) icon = '<i class="fa-solid fa-dumbbell"></i> ';
                    else if (lower.includes('fridge')) icon = '<i class="fa-solid fa-snowflake"></i> ';
                    else if (lower.includes('water') || lower.includes('ro')) icon = '<i class="fa-solid fa-bottle-water"></i> ';
                    else if (lower.includes('kitchen')) icon = '<i class="fa-solid fa-fire-burner"></i> ';
                    else if (lower.includes('cook')) icon = '<i class="fa-solid fa-kitchen-set"></i> ';
                    else if (lower.includes('geyser')) icon = '<i class="fa-solid fa-faucet"></i> ';

                    return `<span class="interest-tag">${icon}${am}</span>`;
                }).join('');

                if (amenities.length > 5) {
                    amenitiesHTML += `<span class="interest-tag view-more" style="background: transparent;">+${amenities.length - 5}</span>`;
                }
            }

            return `
            <div class="listing-card" ${style} ${dataAttrs} style="cursor: pointer;">
                <div class="card-content">
                    <div class="card-avatar">
                       <img src="${avatar}" alt="Owner Avatar">
                    </div>
                    <div class="card-details">
                        <h3>${item.ownerName || 'User'}${verifiedIcon}${pgIcon}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${address}${location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Looking For</span>
                                <span class="value">${item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : 'Any'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Occupancy</span>
                                <span class="value">${occupancy}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="match-wrapper">
                        <span class="match-score">${item.matchScore}% match!</span>
                        ${amenitiesHTML ? `
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Amenities</div>
                            <div class="interests-grid">
                                ${amenitiesHTML}
                            </div>
                        </div>` : ''}
                    </div>
                    <button class="btn-contact"><i class="fa-solid fa-message"></i></button>
                </div>
            </div>`;
        } else {
            // Fallback
            return ``;
        }
    }

    function getFilteredData() {
        const data = currentType === 'Roommates' ? allUsers : flatsData;
        let filtered = data;

        // 1. Filter by Dropdown (Gender)
        // The dropdown has "Male", "Female", "Any"
        if (currentFilter.toLowerCase() !== 'any') {
            if (currentType === 'Roommates') {
                filtered = filtered.filter(item => (item.userGender || '').toLowerCase() === currentFilter.toLowerCase());
            } else {
                // For Flats, we might filter by owner gender or flat preference? 
                // Assuming owner gender for now as per previous logic, or maybe flat "looking for"?
                // Previous logic used item.gender. 
                // Flats data has 'gender' field (Looking For) from roomModal.
                // But wait, roomModal has "Looking For" (gender) field.
                // Let's check if flatsData has 'gender' field. Yes, from roomModal.
                // But wait, I changed flatsData to include owner details.
                // The flat doc itself has 'gender' (Looking For).
                filtered = filtered.filter(item => (item.gender || '').toLowerCase() === currentFilter.toLowerCase());
            }
        }

        // 2. Filter by Location (Search Input)
        if (searchInput && searchInput.value.trim() !== '') {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(item => (item.location || '').toLowerCase().includes(searchTerm));
        }

        return filtered;
    }

    function renderItems() {
        const filteredData = getFilteredData();

        if (filteredData.length === 0) {
            if (currentType === 'Flats') {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">No flats available yet.</p>';
            } else {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">No matches found.</p>';
            }
            return;
        }

        let html = '';
        // Simple pagination
        const end = Math.min(currentIndex + itemsPerPage, filteredData.length);

        for (let i = currentIndex; i < end; i++) {
            const item = filteredData[i];
            html += getCardHTML(item, currentType, i);
        }

        if (currentIndex === 0) {
            container.innerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        currentIndex = end;

        // Hide more button if no more items
        if (moreBtn) {
            if (currentIndex >= filteredData.length) {
                moreBtn.style.display = 'none';
            } else {
                moreBtn.style.display = 'block';
            }
        }
    }

    function init() {
        container.innerHTML = '';
        currentIndex = 0;
        renderItems();

        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }




    // --- Toggle Options Logic ---
    toggleOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('active')) return;

            toggleOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            const type = option.querySelector('span').textContent;
            currentType = type;

            console.log('Switched to:', currentType);

            if (currentType === 'Flats') {
                fetchFlats();
            } else if (currentType === 'Roommates') {
                fetchMatches();
            } else {
                init();
            }
        });
    });


    if (moreBtn && container) {
        moreBtn.addEventListener('click', () => {
            renderItems();
        });
    }


    if (dropdownButton && dropdownItems.length > 0) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedText = item.textContent;

                currentFilter = selectedText.trim();
                console.log('Filter set to:', currentFilter);

                dropdownButton.innerHTML = `${selectedText} <i class="fa-solid fa-chevron-down"></i>`;

                init();
            });
        });
    }

    // --- Search Input Logic ---
    if (searchInput) {
        // 1. Check URL for location on load
        const urlParams = new URLSearchParams(window.location.search);
        const locationsParam = urlParams.get('location');

        if (locationsParam) {
            searchInput.value = locationsParam;
            // Trigger filter immediately if data is already loaded, 
            // but fetchMatches/fetchFlats will call init() anyway.
            // However, we need to ensure the filter is applied after data load.
            // The renderItems() calls getFilteredData() which reads searchInput.value.
            // So just setting the value here is enough for the initial render.
        }

        // 3. Check URL for Type (Roommates vs Flats)
        const typeParam = urlParams.get('type');
        if (typeParam && (typeParam === 'Flats' || typeParam === 'Roommates')) {
            currentType = typeParam;

            // Update UI Toggles
            toggleOptions.forEach(opt => {
                const spanText = opt.querySelector('span').textContent;
                if (spanText === currentType) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        }

        // 2. Add Event Listener for typing
        searchInput.addEventListener('input', () => {
            init(); // Re-render on typing
        });
    }

    // --- Access Control (Event Delegation) ---
    if (container) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.listing-card');
            const chatBtn = e.target.closest('.btn-contact');

            if (card) {
                // Check if Chat Button was clicked
                if (chatBtn) {
                    e.preventDefault();
                    if (!currentUser) {
                        window.location.href = 'regimob.html?mode=login';
                        return;
                    }

                    const id = card.dataset.id;
                    const type = card.dataset.type;

                    if (type === 'Roommates' || type === 'Flats') {
                        // 1. Verification Check
                        const item = type === 'Roommates'
                            ? allUsers.find(u => u.id === id)
                            : flatsData.find(f => f.id === id);

                        // Check Current User
                        if (!currentUserData || !currentUserData.isVerified) {
                            showToast("You must be verified to start a chat.", "warning");
                            return;
                        }

                        // Check Target User
                        if (!item || !item.isVerified) {
                            showToast("You can only chat with verified users.", "warning");
                            return;
                        }

                        if (item && window.startChat) {
                            // 2. Map Correct User Data for Chat (Requirement/Flat -> User)
                            const targetUser = {
                                id: item.userId, // Use the actual User ID
                                name: type === 'Roommates' ? item.userName : item.ownerName, // Use the resolved User Name
                                avatar: type === 'Roommates' ? item.userPhoto : item.ownerPhoto, // Use the resolved User Photo
                                isVerified: item.isVerified
                            };
                            window.startChat(targetUser);
                        }
                    }
                    return; // Prevent card click navigation
                }

                // Normal Card Click -> Navigation
                // Check Auth
                if (!currentUser) {
                    // Not logged in -> Redirect to Login
                    window.location.href = 'regimob.html?mode=login';
                    return;
                }

                // Logged in -> Navigate to details
                const id = card.dataset.id;
                const type = card.dataset.type;

                if (type === 'Roommates') {
                    window.location.href = `lookingroom.html?id=${id}`;
                } else {
                    window.location.href = `lookingroommate.html?id=${id}&type=flat`;
                }
            }
        });
    }

    // Initial init is called in fetchMatches or if user not logged in
    // But we can call it here too just in case, though it might be empty initially
    // init(); 

    // --- Google Maps Autocomplete ---
    function initMatchAutocomplete() {
        const input = document.getElementById('matchSearchInput');
        if (!input) return;

        const checkGoogle = setInterval(() => {
            if (window.google && google.maps && google.maps.places) {
                clearInterval(checkGoogle);
                const autocomplete = new google.maps.places.Autocomplete(input, {
                    types: ['(cities)'],
                    componentRestrictions: { country: 'in' }
                });

                autocomplete.addListener('place_changed', () => {
                    // Trigger search/filter when place is selected
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                });
            }
        }, 100);
    }

    initMatchAutocomplete();

});
