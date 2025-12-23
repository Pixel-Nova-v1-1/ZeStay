import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {

    // --- Mock Data simulating database fetch ---
    // In a real app, you would fetch this by ID from the URL: ?id=123
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id') || 0; // Default to 0 if no ID

    const roommatesData = [
        {
            name: 'Tanvi',
            location: 'Navi Mumbai, Maharashtra',
            rent: '5,000',
            occupancy: 'Single', // or Shared
            gender: 'Female',
            lookingFor: 'Female',
            description: 'I am a working professional looking for a clean and quiet place. I love reading and cooking.',
            image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
            preferences: [
                { name: 'Night Owl', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842878392242309/1.png' },
                { name: 'Music Lover', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842877993795646/3.png' },
                { name: 'Non-alcoholic', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842876672577627/5.png' }
            ],
            highlights: ['Clean & organized', 'Easy going', 'Flexible routine', 'College student', 'Long-term stay']
        },
        {
            name: 'Anirudh',
            location: 'Mumbai, Maharashtra',
            rent: '7,000',
            occupancy: 'Shared',
            gender: 'Male',
            lookingFor: 'Male',
            description: 'Hey! I am Anirudh. Easy going and chill. Need a flat near Andheri.',
            image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka',
            preferences: [
                { name: 'Early Bird', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842877566095521/2.png' },
                { name: 'Quiet Seeker', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842877146529792/4.png' }
            ],
            highlights: ['Working professional', 'Fitness freak', 'Privacy focused']
        },
        {
            name: 'Aditya',
            location: 'Pune',
            rent: '6,000',
            occupancy: 'Single',
            gender: 'Male',
            lookingFor: 'Male',
            description: 'Looking for a decent place in Pune.',
            image: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jasmine',
            preferences: [
                { name: 'Gamer', img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842878392242309/1.png' } // Reusing for demo
            ],
            highlights: ['Gamer', 'Movie Buff']
        }
    ];

    const userData = roommatesData[userId] || roommatesData[0]; // Fallback to first user

    // --- Populate DOM ---
    if (userData) {
        document.getElementById('profileImage').src = userData.image;
        document.getElementById('profileName').textContent = userData.name;
        document.getElementById('displayLocation').textContent = userData.location;
        document.getElementById('displayGender').textContent = userData.gender;
        document.getElementById('displayRent').textContent = userData.rent;
        document.getElementById('displayOccupancy').textContent = userData.occupancy || 'Single';
        document.getElementById('displayLookingFor').textContent = userData.lookingFor;
        document.getElementById('displayDescription').textContent = userData.description;

        // Populate Preferences
        const prefContainer = document.getElementById('preferencesContainer');
        prefContainer.innerHTML = ''; // Clear static/loading content
        if (userData.preferences && userData.preferences.length > 0) {
            userData.preferences.forEach(pref => {
                const prefHTML = `
                    <div class="item-circle">
                        <div class="circle-icon"><img src="${pref.img}" alt="${pref.name}"></div>
                        <span class="item-label">${pref.name}</span>
                    </div>
                `;
                prefContainer.innerHTML += prefHTML;
            });
        }

        // Populate Highlights
        const highlightContainer = document.getElementById('highlightsContainer');
        highlightContainer.innerHTML = '';
        if (userData.highlights && userData.highlights.length > 0) {
            userData.highlights.forEach(hl => {
                const hlHTML = `<div class="highlight-pill"><i class="fa-solid fa-check"></i> ${hl}</div>`;
                highlightContainer.innerHTML += hlHTML;
            });
        }

    }

    // --- Auth Logic (Firebase) ---
    onAuthStateChanged(auth, async (user) => {
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('matchProfileBtn');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';

            if (profileBtn) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);

                    let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        imgSrc = data.photoUrl || imgSrc;
                    }

                    profileBtn.innerHTML = `<img src="${imgSrc}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid white;">`;
                    profileBtn.style.padding = '0';
                    profileBtn.style.overflow = 'hidden';
                    profileBtn.style.width = '45px';
                    profileBtn.style.height = '45px';

                    profileBtn.onclick = () => {
                        window.location.href = 'profile.html';
                    };
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
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
        }
    });

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
    function submitReport(reason) {
        // TODO: Backend integration point
        console.log("Report Submitted:", {
            listingId: "CURRENT_LISTING_ID", // Replace with actual ID
            reason: reason,
            timestamp: new Date().toISOString(),
            user: auth.currentUser ? auth.currentUser.uid : 'Anonymous'
        });

        alert(`Thank you for your feedback! Reported as: ${reason === 'occupied' ? 'Occupied' : 'Wrong Information'}`);
    }

});
