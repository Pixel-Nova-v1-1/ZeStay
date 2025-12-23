import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {

    // --- Mock Data simulating functionality for Backend Integration ---
    // In a real app, 'id' would be passed in the URL (e.g., lookingroommate.html?id=101)
    // and you would fetch data from the server: fetch(`/api/listing/${id}`)

    const mockData = {
        name: "Devjith",
        avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Robert",
        location: "Vashi, Navi Mumbai",
        gender: "Male",
        rent: "6000",
        occupancy: "Single",
        lookingFor: "Female",
        description: "Hey! I am looking for a roommate. I am a techie and love to travel. The room is spacious and well ventilated.",

        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&w=800&q=80",
            "https://images.unsplash.com/photo-1594873604892-b599f847e859?ixlib=rb-4.0.3&w=800&q=80",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&w=800&q=80"
        ],

        preferences: [
            { label: "Night Owl", img: 'https://media.discordapp.net/attachments/1447539234528428034/1451842878392242309/1.png?ex=6947a58c&is=6946540c&hm=4beaa2241099fade45cc8db362da8dab01c34f66fe51eee157d6179bc41d956b&=&format=webp&quality=lossless&width=813&height=813' },
            { label: "Studious", img: "https://media.discordapp.net/attachments/1447539234528428034/1451842867218874500/6.png?ex=6947a589&is=69465409&hm=367bc3ede70cef222877705958cfcfaa899ec5bcec94312dc96c746b89e5c211&=&format=webp&quality=lossless&width=813&height=813" },
            { label: "Music Lover", img: "https://media.discordapp.net/attachments/1447539234528428034/1451842876764979373/3.png?ex=6947a58b&is=6946540b&hm=2e57e6525773c585c332b6c2b7c712e736d1dc4dcf9d0e037d9a084bcde923b0&=&format=webp&quality=lossless&width=813&height=813" }
        ],

        amenities: [
            { label: "Washing Machine", icon: "fa-shirt" },
            { label: "WiFi", icon: "fa-wifi" },
            { label: "AC", icon: "fa-wind" }
        ],

        highlights: [
            "Fully furnished",
            "Gated society",
            "Market nearby"
        ]
    };

    // --- 1. Populate Data ---
    async function loadData() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type');

        let data = mockData;

        if (id && type === 'flat') {
            try {
                const docRef = doc(db, "flats", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const flatData = docSnap.data();
                    
                    // Map Firestore data to UI structure
                    data = {
                        name: "Flat Owner", 
                        avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Owner",
                        location: flatData.location || "Location not specified",
                        gender: flatData.gender || "Any", 
                        rent: flatData.rent || "N/A",
                        occupancy: flatData.occupancy || "Any",
                        lookingFor: flatData.gender || "Any",
                        description: flatData.description || "No description provided.",
                        images: flatData.photos || [],
                        preferences: [], 
                        amenities: (flatData.amenities || []).map(am => ({ label: am, icon: 'fa-check' })), 
                        highlights: flatData.highlights || []
                    };

                    // Fetch Owner Name if userId exists
                    if (flatData.userId) {
                        try {
                            const userDoc = await getDoc(doc(db, "users", flatData.userId));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                data.name = userData.name || "Flat Owner";
                                data.avatar = userData.photoUrl || data.avatar;
                            }
                        } catch (e) {
                            console.log("Could not fetch owner details");
                        }
                    }

                } else {
                    console.log("No such flat document!");
                }
            } catch (error) {
                console.error("Error getting flat details:", error);
            }
        }

        // Profile
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profileImage').src = data.avatar;

        // Basic Info
        document.getElementById('displayLocation').textContent = data.location;
        document.getElementById('displayGender').textContent = data.gender;
        document.getElementById('displayRent').textContent = data.rent;
        document.getElementById('displayOccupancy').textContent = data.occupancy;
        document.getElementById('displayLookingFor').textContent = data.lookingFor;
        document.getElementById('displayDescription').textContent = data.description;

        // Images
        currentImages = data.images.length > 0 ? data.images : ['public/images/house-removebg-preview.png'];
        updateSlider(0);

        // Preferences
        const prefsContainer = document.getElementById('preferencesContainer');
        prefsContainer.innerHTML = '';
        if (data.preferences && data.preferences.length > 0) {
            data.preferences.forEach(pref => {
                prefsContainer.innerHTML += `
                    <div class="item-circle">
                        <div class="circle-icon"><img src="${pref.img}" alt="${pref.label}"></div>
                        <span class="item-label">${pref.label}</span>
                    </div>
                `;
            });
        } else {
             prefsContainer.innerHTML = '<p>No specific preferences listed.</p>';
        }

        // Amenities
        const amenitiesContainer = document.getElementById('amenitiesContainer');
        amenitiesContainer.innerHTML = '';
        if (data.amenities && data.amenities.length > 0) {
            data.amenities.forEach(am => {
                let iconClass = am.icon || 'fa-check';
                const lowerLabel = am.label.toLowerCase();
                if (lowerLabel.includes('wifi')) iconClass = 'fa-wifi';
                else if (lowerLabel.includes('wash')) iconClass = 'fa-shirt';
                else if (lowerLabel.includes('ac') || lowerLabel.includes('air')) iconClass = 'fa-wind';
                else if (lowerLabel.includes('park')) iconClass = 'fa-car';
                else if (lowerLabel.includes('tv')) iconClass = 'fa-tv';
                else if (lowerLabel.includes('lift')) iconClass = 'fa-elevator';
                
                amenitiesContainer.innerHTML += `
                    <div class="item-circle">
                        <div class="amenity-icon"><i class="fa-solid ${iconClass}"></i></div>
                        <span class="item-label">${am.label}</span>
                    </div>
                `;
            });
        }

        // Highlights
        const highContainer = document.getElementById('highlightsContainer');
        highContainer.innerHTML = '';
        if (data.highlights && data.highlights.length > 0) {
            data.highlights.forEach(h => {
                highContainer.innerHTML += `
                     <div class="highlight-pill"><i class="fa-solid fa-check"></i> ${h}</div>
                `;
            });
        }

    }

    // --- 2. Slider Logic ---
    let currentImageIndex = 0;
    let currentImages = [];
    const sliderImg = document.getElementById('sliderImage');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    function updateSlider(index) {
        if (currentImages.length === 0) return;

        currentImageIndex = index;
        if (currentImageIndex < 0) currentImageIndex = currentImages.length - 1;
        if (currentImageIndex >= currentImages.length) currentImageIndex = 0;

        sliderImg.src = currentImages[currentImageIndex];

        // Update dots (if dynamic, but simplistic here)
        // ...
    }

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => updateSlider(currentImageIndex - 1));
        nextBtn.addEventListener('click', () => updateSlider(currentImageIndex + 1));
    }


    // Initialize
    loadData();


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
    async function submitReport(reason) {
        if (!auth.currentUser) {
            alert("Please login to report.");
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type'); // 'flat' or undefined (roommate)

        if (!id) {
            alert("Cannot report: No listing ID found.");
            return;
        }

        try {
            await addDoc(collection(db, "reports"), {
                reportedEntityId: id,
                reportedEntityType: type === 'flat' ? 'flat' : 'roommate_listing',
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
