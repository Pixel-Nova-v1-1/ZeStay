import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { startChat } from "./chat.js";

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
            alert("No user specified.");
            window.location.href = 'match.html';
            return;
        }

        try {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                renderProfile(userData);
            } else {
                alert("User not found.");
                window.location.href = 'match.html';
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            alert("Error loading profile.");
        }
    }

    function renderProfile(userData) {
        const avatar = userData.photoUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userData.name}`;

        document.getElementById('profileImage').src = avatar;
        document.getElementById('profileName').textContent = userData.name || 'User';

        // Verification Badge
        const verificationBadge = document.getElementById('verificationBadge');
        if (verificationBadge) {
            verificationBadge.style.display = userData.isVerified ? 'inline-block' : 'none';
        }

        document.getElementById('displayLocation').textContent = userData.location || 'Not specified';
        document.getElementById('displayGender').textContent = userData.gender || 'Not specified';
        document.getElementById('displayRent').textContent = userData.rent ? `₹ ${userData.rent}` : 'Not specified';
        document.getElementById('displayOccupancy').textContent = userData.occupancy || 'Single';
        document.getElementById('displayLookingFor').textContent = userData.gender ? `Same as gender (${userData.gender})` : 'Any'; // Inferring
        document.getElementById('displayDescription').textContent = userData.description || 'No description provided.';

        // Verified Box in Basic Info
        if (userData.isVerified) {
            const infoGrid = document.querySelector('.info-grid');
            if (infoGrid) {
                // Check if already added to prevent duplicates if re-rendered
                if (!infoGrid.querySelector('.verified-box')) {
                    const verifiedBox = document.createElement('div');
                    verifiedBox.className = 'info-item verified-box';
                    verifiedBox.innerHTML = `
                        <h4>Status</h4>
                        <p><i class="fa-solid fa-circle-check" style="color: #2ecc71;"></i> Verified</p>
                    `;
                    infoGrid.appendChild(verifiedBox);
                }
            }
        }

        // Populate Preferences
        const prefContainer = document.getElementById('preferencesContainer');
        prefContainer.innerHTML = '';

        if (userData.preferences && userData.preferences.length > 0) {
            userData.preferences.forEach(prefId => {
                // Handle legacy underscores
                const key = prefId.replace(/_/g, '-');
                const pref = preferenceMap[key];

                if (pref) {
                    const prefHTML = `
                        <div class="item-circle">
                            <div class="circle-icon"><img src="${pref.image}" alt="${pref.label}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;"></div>
                            <span class="item-label">${pref.label}</span>
                        </div>
                    `;
                    prefContainer.innerHTML += prefHTML;
                }
            });
        } else {
            prefContainer.innerHTML = '<p>No preferences selected.</p>';
        }

        // Populate Highlights (Hobbies)
        const highlightContainer = document.getElementById('highlightsContainer');
        highlightContainer.innerHTML = '';

        let hobbies = [];
        if (userData.hobbies) {
            if (Array.isArray(userData.hobbies)) hobbies = userData.hobbies;
            else hobbies = userData.hobbies.split(',').map(s => s.trim());
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
                alert("Please login to chat.");
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
                    try {
                        if (targetId) {
                            const targetDoc = await getDoc(doc(db, "users", targetId));
                            if (targetDoc.exists() && targetDoc.data().isVerified) {
                                targetVerified = true;
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching target user:", e);
                    }

                    if (!targetVerified) {
                        alert("The other user is not verified yet. You cannot message them.");
                        return;
                    }

                    const targetName = document.getElementById('profileName').textContent;
                    const targetAvatar = document.getElementById('profileImage').src;

                    window.startChat({
                        id: targetId,
                        name: targetName,
                        avatar: targetAvatar,
                        online: true,
                        isBot: false
                    });

                } else {
                    alert("Only verified users can initiate chats. Please get verified!");
                }
            } catch (err) {
                console.error("Error checking verification:", err);
                alert("Error checking verification: " + err.message);
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
            alert("Please login to report.");
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

            alert(`Thank you for your feedback! Reported as: ${reason === 'occupied' ? 'Occupied' : 'Wrong Information'}`);
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report. Please try again.");
        }
    }

});
