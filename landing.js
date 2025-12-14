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

// Redirect to Match Page logic
const landingSearchBtn = document.getElementById('landingSearchBtn');
const landingSearchInput = document.getElementById('landingSearchInput');

if (landingSearchBtn && landingSearchInput) {
    landingSearchBtn.addEventListener('click', () => {
        const query = landingSearchInput.value.trim();

        // Determine search type based on active tab
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