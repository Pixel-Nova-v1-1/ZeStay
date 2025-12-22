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

/* Wait for Google Maps script to load */
window.addEventListener('load', () => {
    const waitForGoogle = setInterval(() => {
        if (window.google && google.maps && google.maps.places) {
            clearInterval(waitForGoogle);
            initLandingAutocomplete();
        }
    }, 100);
});

/* =========================================================
   SEARCH BUTTON LOGIC
   ========================================================= */

const landingSearchBtn = document.getElementById('landingSearchBtn');
const landingSearchInput = document.getElementById('landingSearchInput');

if (landingSearchBtn && landingSearchInput) {
    landingSearchBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab.active');
        let searchType = 'Roommates';

        if (activeTab && activeTab.innerText.toLowerCase().includes('room')) {
            searchType = 'Flats';
        }

        let url = `match.html?type=${searchType}`;

        if (selectedPlace) {
            url += `&placeId=${selectedPlace.placeId}`;
            url += `&lat=${selectedPlace.lat}`;
            url += `&lng=${selectedPlace.lng}`;
        } else if (landingSearchInput.value.trim()) {
            url += `&location=${encodeURIComponent(landingSearchInput.value.trim())}`;
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

document.addEventListener('DOMContentLoaded', checkLoginStatus);

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const logoutBtn = document.getElementById('logoutBtn');
    const landingProfileBtn = document.getElementById('landingProfileBtn');

    if (isLoggedIn) {
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';

        if (landingProfileBtn) {
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
                const data = JSON.parse(storedProfile);
                let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User';

                if (data.profileOption === 'upload' && data.uploadedAvatar) {
                    imgSrc = data.uploadedAvatar;
                } else if (data.profileOption === 'avatar' && data.avatarId) {
                    imgSrc = data.avatarId.startsWith('http')
                        ? data.avatarId
                        : `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.avatarId}`;
                }

                let badgeHtml = '';
                if (localStorage.getItem('isVerified') === 'true') {
                    badgeHtml = `
                        <span class="fa-stack" style="font-size:8px; position:absolute; bottom:0; right:-5px;">
                            <i class="fa-solid fa-certificate fa-stack-2x" style="color:#2196F3;"></i>
                            <i class="fa-solid fa-check fa-stack-1x" style="color:white;"></i>
                        </span>`;
                }

                landingProfileBtn.style.position = 'relative';
                landingProfileBtn.innerHTML = `
                    <img src="${imgSrc}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:2px solid white;">
                    ${badgeHtml}
                `;
            }

            landingProfileBtn.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('isVerified');
            window.location.reload();
        });
    }
}

/* =========================================================
   BACKEND PLACEHOLDERS
   ========================================================= */

async function loginUser(email, password) {
    console.log("Attempting login...");
}

async function registerUser(userData) {
    console.log("Attempting registration...");
}
