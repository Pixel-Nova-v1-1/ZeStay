import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { startChat } from "./chat.js";
import { showToast } from "./toast.js";

document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    const preferenceMap = {
        'night-owl': { label: 'Night Owl', image: 'public/images/nightowl.png' },
        'early-bird': { label: 'Early Bird', image: 'public/images/earlybird.png' },
        'music-lover': { label: 'Music Lover', image: 'public/images/music.png' },
        'quiet-seeker': { label: 'Quiet Seeker', image: 'public/images/quiet.png' },
        'pet-lover': { label: 'Pet Lover', image: 'public/images/petlover.png' },
        'studious': { label: 'Studious', image: 'public/images/studious.png' },
        'sporty': { label: 'Sporty', image: 'public/images/sporty.png' },
        'guest-friendly': { label: 'Guest Friendly', image: 'public/images/guestfriendly.png' },
        'wanderer': { label: 'Wanderer', image: 'public/images/wanderer.png' },
        'clean-centric': { label: 'Clean centric', image: 'public/images/cleaner.png' },
        'non-alcoholic': { label: 'Non-alcoholic', image: 'public/images/nonalcoholic.png' },
        'non-smoker': { label: 'Non-smoker', image: 'public/images/nonsmoker.png' }
    };

    async function loadUserProfile() {
        if (!userId) {
            showToast("No user specified.", "error");
            window.location.href = 'match.html';
            return;
        }

        try {
            // 1. Try to fetch from 'requirements' collection first (since match.js links here with reqId)
            const reqDocRef = doc(db, "requirements", userId);
            const reqDocSnap = await getDoc(reqDocRef);

            if (reqDocSnap.exists()) {
                const reqData = reqDocSnap.data();

                // 2. Fetch User Data
                if (reqData.userId) {
                    const userDocRef = doc(db, "users", reqData.userId);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        // Merge Data: Requirement takes precedence for specific fields
                        const mergedData = {
                            ...userData, // name, photoUrl, gender (user), hobbies
                            ...reqData,  // rent, location, occupancy, description, highlights (preferences)
                            userGender: userData.gender, // Explicitly store user gender
                            lookingForGender: reqData.gender // Explicitly store looking for gender
                        };
                        renderProfile(mergedData);
                        return;
                    }
                }
                // If user not found but req exists (shouldn't happen ideally), render what we have
                renderProfile(reqData);
            } else {
                // Fallback: Check if it's a direct user ID (legacy support or direct link)
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    renderProfile(userDocSnap.data());
                } else {
                    showToast("Listing not found.", "error");
                    window.location.href = 'match.html';
                }
            }
        } catch (error) {
            console.error("Error fetching details:", error);
            showToast("Error loading details.", "error");
        }
    }

    function renderProfile(data) {
        const avatar = data.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.name || 'User'}`;

        document.getElementById('profileImage').src = avatar;
        document.getElementById('profileName').textContent = data.name || 'User';

        // Verification Badge
        const verificationBadge = document.getElementById('verificationBadge');
        if (verificationBadge) {
            verificationBadge.style.display = data.isVerified ? 'inline-block' : 'none';
        }

        document.getElementById('displayLocation').textContent = data.location || 'Not specified';

        const addressEl = document.getElementById('displayAddress');
        const addressContainer = document.getElementById('addressContainer');
        if (addressEl && addressContainer) {
            if (data.address) {
                addressEl.textContent = data.address;
                addressContainer.style.display = 'flex';
            } else {
                addressContainer.style.display = 'none';
            }
        }

        document.getElementById('displayGender').textContent = data.userGender || 'Not specified';
        document.getElementById('displayRent').textContent = data.rent ? `₹ ${data.rent}` : 'Not specified';
        document.getElementById('displayOccupancy').textContent = data.occupancy || 'Single';
        document.getElementById('displayLookingFor').textContent = data.lookingForGender || 'Any';
        document.getElementById('displayDescription').textContent = data.description || 'No description provided.';

        // Verified/Unverified Box in Basic Info
        const infoGrid = document.querySelector('.info-grid');
        if (infoGrid) {
            let verifiedBox = infoGrid.querySelector('.verified-box');
            if (!verifiedBox) {
                verifiedBox = document.createElement('div');
                verifiedBox.className = 'info-item verified-box';
                infoGrid.appendChild(verifiedBox);
            }

            if (data.isVerified) {
                verifiedBox.innerHTML = `
                    <h4>Status</h4>
                    <p><i class="fa-solid fa-circle-check" style="color: #2ecc71;"></i> Verified</p>
                `;
            } else {
                verifiedBox.innerHTML = `
                    <h4>Status</h4>
                    <p><i class="fa-solid fa-circle-xmark" style="color: #e74c3c;"></i> Unverified</p>
                `;
            }
        }

        // Populate Preferences
        const prefContainer = document.getElementById('preferencesContainer');
        prefContainer.innerHTML = '';

        // Use 'highlights' from requirement if available, else 'preferences' from user
        const preferences = data.highlights || data.preferences || [];

        if (preferences.length > 0) {
            preferences.forEach(prefItem => {
                // Check if it maps to an icon, otherwise display generic
                // The chips are text like "Clean & organized". 
                // We can try to find a partial match or just display text.

                let image = 'public/images/star.png'; // Default icon
                let label = prefItem;

                // Simple mapping attempt (can be expanded)
                const lowerPref = prefItem.toLowerCase();
                if (lowerPref.includes('clean')) image = 'public/images/cleaner.png';
                else if (lowerPref.includes('quiet') || lowerPref.includes('calm')) image = 'public/images/quiet.png';
                else if (lowerPref.includes('music')) image = 'public/images/music.png';
                else if (lowerPref.includes('pet')) image = 'public/images/petlover.png';
                else if (lowerPref.includes('sport')) image = 'public/images/sporty.png';
                else if (lowerPref.includes('guest')) image = 'public/images/guestfriendly.png';
                else if (lowerPref.includes('party') || lowerPref.includes('social')) image = 'public/images/party.png'; // Assuming party image exists or use generic
                else if (lowerPref.includes('work')) image = 'public/images/work.png'; // Assuming work image exists

                // If we don't have the specific images, we can just use a default style or try to use the existing map if keys match
                // But since keys don't match, we'll just create a simple item.

                // If the item is just a string
                const prefHTML = `
                    <div class="item-circle">
                        <div class="circle-icon" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-star" style="color: #666;"></i>
                        </div>
                        <span class="item-label">${label}</span>
                    </div>
                `;
                prefContainer.innerHTML += prefHTML;
            });
        } else {
            prefContainer.innerHTML = '<p>No preferences selected.</p>';
        }

        // Populate Highlights (Hobbies from User)
        const highlightContainer = document.getElementById('highlightsContainer');
        highlightContainer.innerHTML = '';

        let hobbies = [];
        if (data.hobbies) {
            if (Array.isArray(data.hobbies)) hobbies = data.hobbies;
            else hobbies = data.hobbies.split(',').map(s => s.trim());
        }

        if (hobbies.length > 0) {
            hobbies.forEach(hl => {
                if (hl) {
                    const hlHTML = `<div class="highlight-pill"><i class="fa-solid fa-check"></i> ${hl}</div>`;
                    highlightContainer.innerHTML += hlHTML;
                }
            });
        } else {
            highlightContainer.innerHTML = '<p>No hobbies listed.</p>';
        }
        // Adjust font size
        setTimeout(adjustProfileNameFontSize, 0);
    }

    function adjustProfileNameFontSize() {
        const nameEl = document.getElementById('profileName');
        if (!nameEl) return;

        let fontSize = 26; // Start with max font size
        nameEl.style.fontSize = fontSize + 'px';
        nameEl.style.whiteSpace = 'nowrap'; // Ensure it doesn't wrap

        // Reduce font size until it fits
        while (nameEl.scrollWidth > nameEl.clientWidth && fontSize > 16) {
            fontSize--;
            nameEl.style.fontSize = fontSize + 'px';
        }
    }


    window.addEventListener('resize', adjustProfileNameFontSize);

    // --- Auth Logic (Firebase) ---
    onAuthStateChanged(auth, (user) => {
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('matchProfileBtn');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';

            // Load the profile data
            loadUserProfile();

            if (profileBtn) {
                // Just set the image, click handler is already set in HTML or we can set it here
                // But wait, we need to fetch current user's photo for the top right button
                // The loadUserProfile fetches the *viewed* user.
                // We need to fetch *current* user for the top right button.
                fetchCurrentUserProfile(user, profileBtn);
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
            // Allow viewing profiles even if not logged in? 
            // Maybe, but let's load data anyway if ID is present
            loadUserProfile();
        }
    });

    // --- CHAT BUTTON LOGIC ---
    const chatBtn = document.querySelector('.btn-action');
    if (chatBtn) {
        chatBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                showToast("Please login to chat.", "warning");
                return;
            }

            try {
                // Check if current user is verified
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().isVerified) {

                    const urlParams = new URLSearchParams(window.location.search);
                    const targetId = urlParams.get('id');

                    // CHECK TARGET VERIFICATION
                    let targetVerified = false;
                    let realUserId = targetId;

                    try {
                        if (targetId) {
                            // 1. Check if it's a Requirement ID first
                            const reqDoc = await getDoc(doc(db, "requirements", targetId));
                            if (reqDoc.exists()) {
                                realUserId = reqDoc.data().userId;
                            }

                            // 2. Fetch User Doc using resolved ID
                            if (realUserId) {
                                const targetDoc = await getDoc(doc(db, "users", realUserId));
                                if (targetDoc.exists() && targetDoc.data().isVerified) {
                                    targetVerified = true;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching target user:", e);
                    }

                    if (!targetVerified) {
                        showToast("The other user is not verified yet. You cannot message them.", "warning");
                        return;
                    }

                    const targetName = document.getElementById('profileName').textContent;
                    const targetAvatar = document.getElementById('profileImage').src;

                    window.startChat({
                        id: realUserId, // Use resolved User ID
                        name: targetName,
                        avatar: targetAvatar,
                        online: true,
                        isBot: false
                    });

                } else {
                    showToast("Only verified users can initiate chats. Please get verified!", "warning");
                }
            } catch (err) {
                console.error("Error checking verification:", err);
                showToast("Error checking verification: " + err.message, "error");
            }
        });
    }

    async function fetchCurrentUserProfile(user, btn) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';
            if (docSnap.exists()) {
                const data = docSnap.data();
                imgSrc = data.photoUrl || imgSrc;
            }
            btn.innerHTML = `<img src="${imgSrc}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid white;">`;
            btn.style.padding = '0';
            btn.style.overflow = 'hidden';
            btn.style.width = '45px';
            btn.style.height = '45px';
            btn.onclick = () => {
                window.location.href = 'profile.html';
            };
        } catch (e) {
            console.error(e);
        }
    }

    // --- Report Modal Logic ---
    const reportBtn = document.querySelector('.btn-report');
    const modalOverlay = document.getElementById('reportModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalOptions = document.querySelectorAll('.btn-option');

    if (reportBtn && modalOverlay) {
        // Open Modal
        reportBtn.addEventListener('click', () => {
            modalOverlay.classList.add('active');
        });

        // Close Modal
        const closeModal = () => {
            modalOverlay.classList.remove('active');
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

        // Close on outside click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // Handle Options
        modalOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                const reason = btn.getAttribute('data-reason');
                submitReport(reason);
                closeModal();
            });
        });
    }

    // Backend Integration Placeholder
    async function submitReport(reason) {
        if (!auth.currentUser) {
            showToast("Please login to report.", "warning");
            return;
        }

        try {
            await addDoc(collection(db, "reports"), {
                reportedEntityId: userId, // The ID of the user/listing being reported
                reportedEntityType: 'user', // or 'listing' depending on context
                reason: reason,
                reportedBy: auth.currentUser.uid,
                reportedByEmail: auth.currentUser.email,
                timestamp: serverTimestamp(),
                status: 'pending'
            });

            showToast(`Thank you for your feedback! Reported as: ${reason === 'occupied' ? 'Occupied' : 'Wrong Information'}`, "success");
        } catch (error) {
            console.error("Error submitting report:", error);
            showToast("Failed to submit report. Please try again.", "error");
        }
    }

});
