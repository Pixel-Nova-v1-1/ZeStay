// Theme handling logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
const htmlElement = document.documentElement;
const icon = themeToggleBtn?.querySelector('i');

// Check local storage or system preference
const savedTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const currentTheme = savedTheme || systemTheme;

// Apply initial theme
if (currentTheme === 'dark') {
    htmlElement.setAttribute('data-theme', 'dark');
    if (icon) icon.className = 'fa-solid fa-moon'; // Moon icon in dark mode
} else {
    if (icon) icon.className = 'fa-solid fa-sun'; // Sun icon in light mode
}

// Toggle event listener
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = htmlElement.getAttribute('data-theme') === 'dark';

        // Add rotation animation
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 500);

        if (isDark) {
            // Switching to light mode
            htmlElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            setTimeout(() => {
                icon.className = 'fa-solid fa-sun'; // Show sun in light mode
            }, 250);
        } else {
            // Switching to dark mode
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            setTimeout(() => {
                icon.className = 'fa-solid fa-moon'; // Show moon in dark mode
            }, 250);
        }
    });
}
