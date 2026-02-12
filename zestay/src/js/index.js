import { showToast } from "./toast.js";

/* =========================================================
   TAB SWITCHING (Find flatmates / Find room)
   ========================================================= */

const tabs = document.querySelectorAll('.tab');
const input = document.getElementById('landingSearchInput');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (tab.innerText.toLowerCase().includes('room')) {
            input.placeholder = "Enter city to find rooms...";
        } else {
            input.placeholder = "Enter your city or location";
        }
    });
});

/* =========================================================
   SCROLL ANIMATIONS
   ========================================================= */

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active-scroll');
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.feature-card, .step-card').forEach(card => {
    observer.observe(card);
});

const featureImage = document.querySelector('.features-image img');
if (featureImage) observer.observe(featureImage);

/* =========================================================
   GOOGLE PLACES AUTOCOMPLETE
   ========================================================= */

let selectedPlace = null;

function initLandingAutocomplete() {
    const input = document.getElementById('landingSearchInput');
    if (!input || !window.google || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        componentRestrictions: { country: 'in' }
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        selectedPlace = {
            name: place.name,
            placeId: place.place_id,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };

        console.log('Selected place:', selectedPlace);
    });
}

// --- DYNAMIC GOOGLE MAPS LOADER ---
function loadGoogleMaps() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error("Google Maps API Key is missing in .env file");
        return;
    }

    if (document.getElementById('google-maps-script')) {
        // Already loaded, just init
        initLandingAutocomplete();
        return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.defer = true;
    script.async = true;

    script.onload = () => {
        initLandingAutocomplete();
    };

    document.head.appendChild(script);
}

/* Load Maps on Page Load */
window.addEventListener('load', () => {
    loadGoogleMaps();

    // Hide Landing Loader
    const loader = document.getElementById('landingLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('opening');
            // Remove from DOM after curtain transition (1.2s in CSS)
            setTimeout(() => {
                loader.remove();
            }, 1500);
        }, 3000); // 3 seconds to show the premium water fill animation
    }
});

/* =========================================================
   SEARCH BUTTON LOGIC
   ========================================================= */

const landingSearchBtn = document.getElementById('landingSearchBtn');
const landingSearchInput = document.getElementById('landingSearchInput');

if (landingSearchBtn && landingSearchInput) {
    landingSearchBtn.addEventListener('click', () => {
        if (!landingSearchInput.value.trim()) {
            showToast("Please enter a location to search.", "warning");
            return;
        }

        const activeTab = document.querySelector('.tab.active');
        let searchType = 'Roommates';

        if (activeTab && activeTab.innerText.toLowerCase().includes('room')) {
            searchType = 'Flats';
        }

        let url = `match.html?type=${searchType}`;

        // Always include location parameter for text filtering in match.html
        if (landingSearchInput.value.trim()) {
            url += `&location=${encodeURIComponent(landingSearchInput.value.trim())}`;
        }

        if (selectedPlace) {
            url += `&placeId=${selectedPlace.placeId}`;
            url += `&lat=${selectedPlace.lat}`;
            url += `&lng=${selectedPlace.lng}`;
        }

        window.location.href = url;
    });

    landingSearchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') landingSearchBtn.click();
    });
}

/* =========================================================
   AUTH UI PLACEHOLDER
   ========================================================= */

/* =========================================================
   AUTH UI LOGIC (Firebase)
   ========================================================= */
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const logoutBtn = document.getElementById('logoutBtn');
        const landingProfileBtn = document.getElementById('landingProfileBtn');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';

            if (landingProfileBtn) {
                // Fetch user data for photoUrl
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);

                    let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        imgSrc = data.photoUrl || imgSrc;
                    }

                    landingProfileBtn.style.position = 'relative';
                    landingProfileBtn.innerHTML = `
                        <img src="${imgSrc}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:2px solid white;">
                    `;

                    landingProfileBtn.onclick = () => {
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

        // Post Listing Button Logic
        const postListingBtn = document.getElementById('postListingBtn');
        if (postListingBtn) {
            postListingBtn.onclick = (e) => {
                e.preventDefault();
                if (user) {
                    window.location.href = 'why.html';
                } else {
                    window.location.href = 'regimob.html?mode=login';
                }
            };
        }
    });
});

/* =========================================================
   BACKEND PLACEHOLDERS
   ========================================================= */

async function loginUser(email, password) {
    console.log("Attempting login...");
}

async function registerUser(userData) {
    console.log("Attempting registration...");
}
