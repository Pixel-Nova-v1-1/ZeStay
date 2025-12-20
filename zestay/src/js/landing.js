const tabs = document.querySelectorAll('.tab');
const input = document.querySelector('input');
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

const observerOptions = {
    threshold: 0.2
};
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active-scroll');
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .step-card').forEach(card => {
    observer.observe(card);
});
const featureImage = document.querySelector('.features-image img');
if (featureImage) {
    observer.observe(featureImage);
}


const landingSearchBtn = document.getElementById('landingSearchBtn');
const landingSearchInput = document.getElementById('landingSearchInput');

if (landingSearchBtn && landingSearchInput) {
    landingSearchBtn.addEventListener('click', () => {
        const query = landingSearchInput.value.trim();

       
        const activeTab = document.querySelector('.tab.active');
        let searchType = 'Roommates'; // Default
        if (activeTab && activeTab.innerText.toLowerCase().includes('room')) {
            searchType = 'Flats';
        }

        if (query) {
            // Redirect to match.html with location AND type
            window.location.href = `match.html?location=${encodeURIComponent(query)}&type=${searchType}`;
        } else {
            // Redirect with type only (or just match page)
            window.location.href = `match.html?type=${searchType}`;
        }
    });

    // Also allow 'Enter' key to trigger search
    landingSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            landingSearchBtn.click();
        }
    });
}

// User Authentication and Backend Placeholders
document.addEventListener('DOMContentLoaded', () => {
    // Check login status
    checkLoginStatus();
});

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const logoutBtn = document.getElementById('logoutBtn');

    if (isLoggedIn) {
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            window.location.reload();
        });
    }
}


async function loginUser(email, password) {
    try {
        console.log("Attempting login...");
     
    } catch (error) {
        console.error("Login failed:", error);
    }
}

// Placeholder for Register (Connect to SQL/Backend here)
async function registerUser(userData) {
    try {
        console.log("Attempting registration...");
        // const response = await fetch('/api/register', { ... });
    } catch (error) {
        console.error("Registration failed:", error);
    }
}