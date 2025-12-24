import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";

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
                    await fetchMatches();
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
            // If not logged in, maybe show some demo data or redirect? 
            // For now, let's just show empty or ask to login
            container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Please login to see matches.</p>';
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
                    matchScore: matchScore
                };
            });

            const matches = (await Promise.all(matchesPromises)).filter(m => m !== null);

            // Sort by match score descending
            users.sort((a, b) => b.matchScore - a.matchScore);
            allUsers = matches;
            
            if (currentType === 'Roommates') {
                init();
            }

        } catch (error) {
            console.error("Error fetching matches:", error);
            container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Error loading matches.</p>';
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
                    matchScore: matchScore
                };
            });
            
            // Sort by newest first
            flats.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt.seconds - a.createdAt.seconds;
                }
                return 0;
            });

            flatsData = flats;

            if (currentType === 'Flats') {
                init();
            }
        } catch (error) {
            console.error("Error fetching flats:", error);
            if (currentType === 'Flats') {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Error loading flats.</p>';
            }
        }
    }

    function calculateMatchScore(user1, user2) {
        // 1. Personality Score (50%)
        // Max difference approx 20 (5 questions * 4 max diff). 
        // Let's say max diff is 20. 
        const s1 = user1.personalityScore || 0;
        const s2 = user2.personalityScore || 0;
        const diff = Math.abs(s1 - s2);
        // Normalize: 0 diff = 100%, 20 diff = 0%
        // 100 - (diff * 5)
        let personalityMatch = Math.max(0, 100 - (diff * 5));

        // 2. Preferences Match (50%)
        const p1 = user1.preferences || [];
        const p2 = user2.preferences || [];

        if (p1.length === 0) return Math.round(personalityMatch); // If no prefs, rely on personality

        const shared = p1.filter(p => p2.includes(p));
        const prefMatch = (shared.length / Math.max(p1.length, 1)) * 100;

        // Weighted Average
        const finalScore = (personalityMatch * 0.5) + (prefMatch * 0.5);
        return Math.round(finalScore);
    }

    function getCardHTML(item, type, index = 0) {
        const delay = index * 0.1;
        const style = `style="animation-delay: ${delay}s"`;
        // Store type and ID in data attributes for delegation
        const dataAttrs = `data-id="${item.id}" data-type="${type}"`;

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

            const avatar = item.photoUrl || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + item.name;
            const location = item.location || 'Location not specified';
            const rent = item.rent ? `₹ ${item.rent}` : 'Rent not specified';
            const lookingFor = item.gender ? `Gender: ${item.gender}` : 'Any'; // Displaying Gender as "Looking For" context is ambiguous in UI, but let's show Gender.

            return `
            <div class="listing-card" ${style} ${dataAttrs} style="cursor: pointer;">
                <div class="card-content">
                    <div class="card-avatar">
                       <img src="${avatar}" alt="Avatar">
                    </div>
                    <div class="card-details">
                        <h3>${item.name || 'User'}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Gender</span>
                                <span class="value">${item.userGender}</span>
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
                    <button class="btn-contact" onclick="event.stopPropagation()"><i class="fa-solid fa-message"></i></button>
                </div>
            </div>`;
        } else if (type === 'Flats') {
            const avatar = item.ownerPhoto || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + item.id;
            const location = item.location || 'Location not specified';
            const rent = item.rent ? `₹ ${item.rent}` : 'Rent not specified';
            const occupancy = item.occupancy || 'Any';
            
            return `
            <div class="listing-card" ${style} ${dataAttrs} style="cursor: pointer;">
                <div class="card-content">
                    <div class="card-avatar">
                       <img src="${avatar}" alt="Owner Avatar">
                    </div>
                    <div class="card-details">
                        <h3>${item.ownerName || 'User'}${verifiedIcon}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Occupancy</span>
                                <span class="value">${occupancy}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="match-score">${item.matchScore}% match!</span>
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
            if (card) {
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
