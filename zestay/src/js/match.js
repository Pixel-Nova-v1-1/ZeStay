import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { showToast } from "./toast.js";

console.log("match.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    let allUsers = [];
    let flatsData = [];
    let pgsData = []; // New PG Data Array

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

    async function fetchPGs() {
        if (pgsData.length > 0) {
            if (currentType === 'PGs') init();
            return;
        }

        container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Loading PGs...</p>';

        try {
            const querySnapshot = await getDocs(collection(db, "pgs"));

            const pgPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const pgData = docSnapshot.data();
                const pgId = docSnapshot.id;

                if (currentUser && pgData.userId === currentUser.uid) return null;

                let ownerData = {};
                let matchScore = 0;

                if (pgData.userId) {
                    try {
                        // Check if we already have this user
                        if (currentUser && pgData.userId === currentUser.uid) {
                            ownerData = currentUserData;
                        } else {
                            const userDocRef = doc(db, "users", pgData.userId);
                            const userDocSnap = await getDoc(userDocRef);
                            if (userDocSnap.exists()) {
                                ownerData = userDocSnap.data();
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching PG owner:", err);
                    }
                }

                // Match Score for PGs can be simple for now or similar to Flats
                // PGs might not have 'preferences' to match against, keeping it simple or default
                if (currentUserData && ownerData) {
                    matchScore = calculateMatchScore(currentUserData, ownerData);
                }

                return {
                    id: pgId,
                    ...pgData,
                    ownerName: ownerData.name || 'PG Owner',
                    ownerPhoto: ownerData.photoUrl || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + (pgData.userId || 'PG'),
                    isVerified: ownerData.isVerified || false,
                    ownerRole: ownerData.role || 'PG_OWNER',
                    matchScore: matchScore
                };
            });

            const pgs = (await Promise.all(pgPromises)).filter(p => p !== null);
            pgs.sort((a, b) => b.matchScore - a.matchScore);
            pgsData = pgs;

            if (currentType === 'PGs') {
                init();
            }

        } catch (error) {
            console.error("Error fetching PGs:", error);
            if (currentType === 'PGs') {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">Error loading PGs.</p>';
            }
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
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
        const dataAttrs = `data-id="${item.id}" data-type="${type}"`;

        const isListingPgOwner = item.userRole === 'PG_OWNER' || item.ownerRole === 'PG_OWNER';
        const isViewerPgOwner = currentUserData && currentUserData.role === 'PG_OWNER';
        const hideMatch = isListingPgOwner || isViewerPgOwner;

        const verifiedIcon = (item.isVerified && !isListingPgOwner) ? '<i class="fa-solid fa-circle-check" style="color: #4CAF50; margin-left: 5px;"></i>' : '';
        const pgIcon = isListingPgOwner ? '<i class="fa-solid fa-building-user" style="color: #FFD700; margin-left: 5px;" title="PG Owner"></i>' : '';

        if (type === 'Roommates') {
            let interestsHTML = '';
            const interests = item.userPreferences || [];
            let hobbies = [];
            if (item.hobbies) {
                if (Array.isArray(item.hobbies)) hobbies = item.hobbies;
                else hobbies = item.hobbies.split(',').map(s => s.trim());
            }

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
                        ${!hideMatch ? `
                        <span class="match-score">${item.matchScore}% match!</span>
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Common Interests</div>
                            <div class="interests-grid">
                                ${interestsHTML}
                            </div>
                        </div>
                        ` : ''}
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
                        ${!hideMatch ? `<span class="match-score">${item.matchScore}% match!</span>` : ''}
                        ${amenitiesHTML ? `
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Amenities</div>
                            <div class="interests-grid">
                                ${amenitiesHTML}
                            </div>
                        </div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn-review" title="See Reviews">
                            <i class="fa-solid fa-star"></i>
                        </button>
                        <button class="btn-contact"><i class="fa-solid fa-message"></i></button>
                    </div>
                </div>
            </div>`;
        } else if (type === 'PGs') {
            const avatar = item.ownerPhoto || 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + item.id;
            const location = item.location || 'Location not specified';
            const address = item.address ? item.address + ', ' : '';
            const rent = item.rent ? `₹ ${item.rent}/year` : 'Rent not specified';
            const occupancy = item.occupancy || 'Any';
            const pgName = item.pgName || 'PG Name';

            const amenities = item.highlights || item.amenities || [];
            let amenitiesHTML = '';

            if (amenities.length > 0) {
                amenitiesHTML = amenities.slice(0, 5).map(am => {
                    let icon = '<i class="fa-solid fa-check"></i> ';
                    const lower = am.toLowerCase();
                    if (lower.includes('wifi')) icon = '<i class="fa-solid fa-wifi"></i> ';
                    else if (lower.includes('food')) icon = '<i class="fa-solid fa-utensils"></i> ';
                    else if (lower.includes('laundry')) icon = '<i class="fa-solid fa-shirt"></i> ';
                    else if (lower.includes('ac')) icon = '<i class="fa-solid fa-wind"></i> ';
                    else if (lower.includes('tv')) icon = '<i class="fa-solid fa-tv"></i> ';
                    else if (lower.includes('power')) icon = '<i class="fa-solid fa-battery-full"></i> ';
                    else if (lower.includes('security') || lower.includes('cctv')) icon = '<i class="fa-solid fa-shield-halved"></i> ';
                    else if (lower.includes('washroom')) icon = '<i class="fa-solid fa-bath"></i> ';

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
                       <img src="${avatar}" alt="PG Owner">
                    </div>
                    <div class="card-details">
                        <h3>${pgName}${verifiedIcon}${pgIcon}</h3>
                        <p class="location" style="font-size: 0.85rem; color: #666;">By ${item.ownerName}</p>
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
                        ${!hideMatch ? `<span class="match-score">${item.matchScore}% match!</span>` : ''}
                        ${amenitiesHTML ? `
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Highlights</div>
                            <div class="interests-grid">
                                ${amenitiesHTML}
                            </div>
                        </div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn-review" title="See Reviews">
                            <i class="fa-solid fa-star"></i>
                        </button>
                        <button class="btn-contact"><i class="fa-solid fa-message"></i></button>
                    </div>
                </div>
            </div>`;
        } else {
            return ``;
        }
    }

    function getFilteredData() {
        // const data = currentType === 'Roommates' ? allUsers : flatsData;
        let data = [];
        if (currentType === 'Roommates') data = allUsers;
        else if (currentType === 'Flats') data = flatsData;
        else if (currentType === 'PGs') data = pgsData;

        let filtered = data;

        // 1. Filter by Dropdown (Gender)
        // The dropdown has "Male", "Female", "Any"
        if (currentFilter.toLowerCase() !== 'any') {
            if (currentType === 'Roommates') {
                filtered = filtered.filter(item => (item.userGender || '').toLowerCase() === currentFilter.toLowerCase());
            } else if (currentType === 'Flats') {
                // Flats data has 'gender' field (Looking For)
                filtered = filtered.filter(item => (item.gender || '').toLowerCase() === currentFilter.toLowerCase());
            } else if (currentType === 'PGs') {
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
            } else if (currentType === 'PGs') {
                container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">No PGs available yet.</p>';
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
            } else if (currentType === 'PGs') {
                fetchPGs();
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

        // 3. Check URL for Type
        const typeParam = urlParams.get('type');
        if (typeParam && (typeParam === 'Flats' || typeParam === 'Roommates' || typeParam === 'PGs')) {
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

    // --- Unified Review Logic ---
    const unifiedReviewForm = document.getElementById('unifiedReviewForm');
    const toggleReviewFormBtn = document.getElementById('toggleReviewFormBtn');
    const unifiedRatingStars = document.querySelectorAll('#unifiedRatingStars i');
    const unifiedReviewRatingInput = document.getElementById('unifiedReviewRating');
    const unifiedRatingError = document.getElementById('unifiedRatingError');

    // Toggle Form Visibility
    if (toggleReviewFormBtn) {
        toggleReviewFormBtn.onclick = () => {
             if (!currentUser) {
                // If not logged in, redirect
                window.location.href = 'regimob.html?mode=login';
                return;
            }
            unifiedReviewForm.classList.toggle('hidden');
        };
    }

    // Star Rating Logic (Unified)
    function resetUnifiedStars() {
        unifiedRatingStars.forEach(star => {
            star.classList.replace('fa-solid', 'fa-regular');
        });
        if (unifiedReviewRatingInput) unifiedReviewRatingInput.value = '0';
        if (unifiedRatingError) unifiedRatingError.classList.add('hidden');
        if (unifiedReviewForm) {
            unifiedReviewForm.reset();
            unifiedReviewForm.classList.add('hidden');
        }
    }

    unifiedRatingStars.forEach(star => {
        star.onclick = () => {
            const rating = star.dataset.rating;
            unifiedReviewRatingInput.value = rating;

            // Fill stars up to selected
            unifiedRatingStars.forEach(s => {
                const r = s.dataset.rating;
                if (r <= rating) {
                    s.classList.replace('fa-regular', 'fa-solid');
                } else {
                    s.classList.replace('fa-solid', 'fa-regular');
                }
            });
            if (unifiedRatingError) unifiedRatingError.classList.add('hidden');
        };
    });

    // Submit Unified Review
    if (unifiedReviewForm) {
        unifiedReviewForm.onsubmit = async (e) => {
            e.preventDefault();

            const rating = parseInt(unifiedReviewRatingInput.value);
            const comment = document.getElementById('unifiedReviewComment').value.trim();
            const targetId = document.getElementById('unifiedTargetId').value;
            const targetType = document.getElementById('unifiedTargetType').value;
            const ownerId = document.getElementById('unifiedOwnerId').value;

            if (rating === 0) {
                unifiedRatingError.classList.remove('hidden');
                return;
            }

            if (!currentUser) {
                showToast("You must be logged in to submit a review", "error");
                return;
            }

            const submitBtn = unifiedReviewForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            try {
                await addDoc(collection(db, "reviews"), {
                    reviewerId: currentUser.uid,
                    reviewerName: currentUserData.name || 'Anonymous',
                    reviewerPhoto: currentUserData.photoUrl || null,
                    targetId: targetId,
                    targetType: targetType,
                    ownerId: ownerId,
                    rating: rating,
                    comment: comment,
                    createdAt: serverTimestamp()
                });

                showToast("Review submitted successfully!", "success");
                
                // Hide Form and Reset
                unifiedReviewForm.classList.add('hidden');
                unifiedReviewForm.reset();
                resetUnifiedStars();

                // Refresh Reviews List !
                fetchAndShowReviews(targetId);

            } catch (error) {
                console.error("Error submitting review:", error);
                showToast("Failed to submit review. Try again.", "error");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        };
    }

    // --- View Reviews Modal (Unified) ---
    const viewReviewsModal = document.getElementById('viewReviewsModal');
    const closeViewReviewsModal = document.getElementById('closeViewReviewsModal');
    const reviewsListContainer = document.getElementById('reviewsList');
    const avgRatingDisplay = document.getElementById('avgRatingDisplay');
    const avgStarsDisplay = document.getElementById('avgStarsDisplay');
    const totalReviewsDisplay = document.getElementById('totalReviewsDisplay');
    const viewReviewTargetName = document.getElementById('viewReviewTargetName');

    if (closeViewReviewsModal) {
        closeViewReviewsModal.onclick = () => {
            viewReviewsModal.classList.add('hidden');
            if (typeof resetUnifiedStars === 'function') resetUnifiedStars();
        };
        viewReviewsModal.onclick = (e) => {
            if (e.target === viewReviewsModal) {
                viewReviewsModal.classList.add('hidden');
                if (typeof resetUnifiedStars === 'function') resetUnifiedStars();
            }
        };
    }

    async function fetchAndShowReviews(targetId) {
        if (!reviewsListContainer) return;
        reviewsListContainer.innerHTML = '<div class="loading-reviews">Loading reviews...</div>';
        
        try {
            // Updated Query: Removed orderBy to avoid index requirement errors. Sorting client-side instead.
            const q = query(collection(db, "reviews"), where("targetId", "==", targetId));
            const querySnapshot = await getDocs(q);
            const reviews = querySnapshot.docs.map(doc => doc.data());

            // Client-side Sort (Newest First)
            reviews.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.seconds : 0;
                const timeB = b.createdAt ? b.createdAt.seconds : 0;
                return timeB - timeA;
            });

            // Update Header Stats
            if (reviews.length === 0) {
                 if(avgRatingDisplay) avgRatingDisplay.textContent = "0.0";
                 if(avgStarsDisplay) avgStarsDisplay.innerHTML = generateStars(0);
                 if(totalReviewsDisplay) totalReviewsDisplay.textContent = "(0 reviews)";
                 reviewsListContainer.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review!</div>';
            } else {
                const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
                const avgRating = (totalRating / reviews.length).toFixed(1);
                
                if(avgRatingDisplay) avgRatingDisplay.textContent = avgRating;
                if(avgStarsDisplay) avgStarsDisplay.innerHTML = generateStars(avgRating);
                if(totalReviewsDisplay) totalReviewsDisplay.textContent = `(${reviews.length} review${reviews.length !== 1 ? 's' : ''})`;

                // Render List
                reviewsListContainer.innerHTML = reviews.map(review => {
                    const date = review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
                    const avatar = review.reviewerPhoto || `https://api.dicebear.com/9.x/avataaars/svg?seed=${review.reviewerName || 'Anonymous'}`;
                    
                    return `
                    <div class="review-item">
                        <div class="review-header">
                            <div class="reviewer-info">
                                <img src="${avatar}" class="reviewer-avatar" alt="Reviewer">
                                <div>
                                    <div class="reviewer-name">${review.reviewerName || 'Anonymous'}</div>
                                    <div class="review-date">${date}</div>
                                </div>
                            </div>
                            <div class="review-stars">
                                ${generateStars(review.rating, 12)}
                            </div>
                        </div>
                        <div class="review-text">${review.comment || ''}</div>
                    </div>`;
                }).join('');
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
            reviewsListContainer.innerHTML = '<div class="no-reviews">Error loading reviews.</div>';
        }
    }

    function generateStars(rating, size = 18) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars += '<i class="fa-solid fa-star"></i>';
            else if (i - 0.5 <= rating) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
            else stars += '<i class="fa-regular fa-star"></i>';
        }
        return stars;
    }

    // --- Event Delegation for Cards ---
    if (container) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.listing-card');
            const chatBtn = e.target.closest('.btn-contact');
            const reviewBtn = e.target.closest('.btn-review'); // Star Button

            if (!card) return;

            // 1. Star Button Click (Open Unified Review Modal)
            if (reviewBtn) {
                e.preventDefault();
                e.stopPropagation();

                const id = card.dataset.id;
                const type = card.dataset.type;

                // Find data object
                let item = null;
                if (type === 'Roommates') item = allUsers.find(u => u.id === id);
                else if (type === 'Flats') item = flatsData.find(f => f.id === id);
                else if (type === 'PGs') item = pgsData.find(p => p.id === id);

                if (item) {
                    const name = item.ownerName || item.pgName || item.userName || 'Property';
                    if (viewReviewTargetName) viewReviewTargetName.innerText = `Reviews for ${name}`;
                    
                    // Set Hidden Inputs for Unified Form
                    const unifiedTargetId = document.getElementById('unifiedTargetId');
                    const unifiedTargetType = document.getElementById('unifiedTargetType');
                    const unifiedOwnerId = document.getElementById('unifiedOwnerId');

                    if (unifiedTargetId) unifiedTargetId.value = id;
                    if (unifiedTargetType) unifiedTargetType.value = type;
                    if (unifiedOwnerId) unifiedOwnerId.value = item.userId || '';

                    // Open Modal
                    if(viewReviewsModal) viewReviewsModal.classList.remove('hidden');
                    
                    // Fetch existing reviews
                    fetchAndShowReviews(id);
                }
                return;
            }

            // 2. Chat Button Click
            if (chatBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (!currentUser) {
                    window.location.href = 'regimob.html?mode=login';
                    return;
                }
                // Chat Logic...
                const id = card.dataset.id;
                const type = card.dataset.type;
                let item = null;
                if (type === 'Roommates') item = allUsers.find(u => u.id === id);
                else if (type === 'Flats') item = flatsData.find(f => f.id === id);
                else if (type === 'PGs') item = pgsData.find(p => p.id === id);

                if (item) {
                     // Check if verified
                     if (!currentUserData || !currentUserData.isVerified) {
                        showToast("You must be verified to start a chat.", "warning");
                        return;
                    }
                    if (!item.isVerified) {
                         showToast("You can only chat with verified users.", "warning");
                         return;
                    }
                    if (window.startChat) {
                        const targetUser = {
                            id: item.userId,
                            name: type === 'Roommates' ? item.userName : item.ownerName,
                            avatar: type === 'Roommates' ? item.userPhoto : item.ownerPhoto,
                            isVerified: item.isVerified
                        };
                        window.startChat(targetUser);
                    }
                }
                return;
            }

            // 3. Card Click (Navigation)
            if (!currentUser) {
                window.location.href = 'regimob.html?mode=login';
                return;
            }
            const id = card.dataset.id;
            const type = card.dataset.type;

            if (type === 'Roommates') window.location.href = `lookingroom.html?id=${id}`;
            else if (type === 'Flats') window.location.href = `lookingroommate.html?id=${id}&type=flat`;
            else if (type === 'PGs') window.location.href = `lookingroommate.html?id=${id}&type=pg`;
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
