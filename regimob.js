document.addEventListener('DOMContentLoaded', () => {
    const getOtpBtn = document.getElementById('getOtpBtn');
    const phoneInput = document.getElementById('phoneInput');

    if (getOtpBtn && phoneInput) {
        getOtpBtn.addEventListener('click', () => {
            const phoneNumber = phoneInput.value.trim();

            if (phoneNumber === '') {
                showNotification('Please enter a valid phone number.');
                return;
            }


            getOtpBtn.disabled = true;
            getOtpBtn.textContent = 'Sending...';
            getOtpBtn.style.opacity = '0.7';


            sendOtpToBackend(phoneNumber)
                .then((response) => {
                    // Success
                    showNotification(response.message); // "OTP Sent successfully"

                    // Allow user to read the success message briefly before redirecting
                    setTimeout(() => {
                        // Get current mode (login/register) to pass forward
                        const urlParams = new URLSearchParams(window.location.search);
                        const mode = urlParams.get('mode') || 'login';
                        window.location.href = `otp.html?mode=${mode}`;
                    }, 2000);
                })
                .catch((error) => {
                    // Error
                    showNotification(error.message || 'Failed to send OTP');
                    // Reset button
                    getOtpBtn.disabled = false;
                    getOtpBtn.textContent = 'Get OTP';
                    getOtpBtn.style.opacity = '1';
                });
        });
    }

    // --- MOCK API FUNCTION ---
    // This simulates a call to your backend server.
    // Replace this logic with a real fetch() call when the backend is ready.
    function sendOtpToBackend(phoneNumber) {
        return new Promise((resolve, reject) => {
            console.log(`[Mock API] Sending request to send OTP to ${phoneNumber}...`);

            // Simulate network delay (2 seconds)
            setTimeout(() => {
                // Simulate success
                if (phoneNumber.length >= 10) {
                    resolve({ success: true, message: 'OTP sent to your mobile number' });
                } else {
                    reject({ success: false, message: 'Invalid phone number' });
                }
            }, 2000);
        });
    }

    // Reuse the notification UI
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.classList.add('notification-toast');

        notification.innerHTML = `
            <i class="fa-solid fa-message"></i>
            <div class="notification-content">
                <span class="notification-title">System • Now</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }
});