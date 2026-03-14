// Theme handling logic

const initTheme = () => {
    // Prevent multiple initializations if possible, though cloning button handles it safely
    if (window.themeInitialized) {
        console.log("Theme already initialized, skipping.");
        return;
    }
    window.themeInitialized = true;

    console.log("Initializing theme...");
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const currentTheme = savedTheme || systemTheme;
    
    console.log(`Current theme: ${currentTheme}`);

    // Apply initial theme
    if (currentTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
    } else {
        htmlElement.removeAttribute('data-theme');
    }

    // Toggle event listener
    if (themeToggleBtn) {
        // Query icon relative to the button
        let icon = themeToggleBtn.querySelector('i');
        
        // Set initial icon state directly
        if (icon) {
            icon.className = currentTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }

        // Use a named function for the event handler to avoid anonymous function issues if needed
        const handleThemeToggle = (e) => {
            e.preventDefault(); // Prevent any default button behavior
            console.log("Theme toggle clicked");
            
            // Re-check current state from DOM
            const isDark = htmlElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';

            // Update DOM
            if (newTheme === 'dark') {
                htmlElement.setAttribute('data-theme', 'dark');
            } else {
                htmlElement.removeAttribute('data-theme');
            }
            
            // Save preference
            localStorage.setItem('theme', newTheme);

            // Update icon
            if (icon) {
                 // Add rotation animation
                icon.style.transition = 'transform 0.5s ease';
                icon.style.transform = 'rotate(360deg)';
                
                setTimeout(() => {
                    icon.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
                    icon.style.transform = 'rotate(0deg)';
                }, 250);
            }
        };

        // Remove old event listener if we attached one before (using a property on the element)
        if (themeToggleBtn._themeHandler) {
            themeToggleBtn.removeEventListener('click', themeToggleBtn._themeHandler);
        }

        // Attach new listener and store reference
        themeToggleBtn.addEventListener('click', handleThemeToggle);
        themeToggleBtn._themeHandler = handleThemeToggle;

    } else {
        console.warn("Theme toggle button not found during initialization.");
    }
};

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    // If already loaded, run immediately
    initTheme();
}

