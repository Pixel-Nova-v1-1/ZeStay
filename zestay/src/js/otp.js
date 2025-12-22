
const otpInputs = document.querySelectorAll('.otp-input');

otpInputs.forEach((input, index) => {

    input.addEventListener('input', (e) => {
        const value = e.target.value;


        if (!/^\d*$/.test(value)) {
            e.target.value = '';
            return;
        }


        if (value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });


    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });


    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;


        pastedData.split('').forEach((char, i) => {
            if (otpInputs[i]) {
                otpInputs[i].value = char;
            }
        });


        const nextEmpty = pastedData.length < 6 ? otpInputs[pastedData.length] : otpInputs[5];
        if (nextEmpty) nextEmpty.focus();
    });
});


window.addEventListener('load', () => {
    if (otpInputs[0]) {
        otpInputs[0].focus();
    }


    // OTP Verification Logic
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            let enteredOtp = '';
            otpInputs.forEach(input => {
                enteredOtp += input.value;
            });

            if (enteredOtp.length !== 6) {
                alert('Please enter a complete 6-digit OTP.');
                return;
            }

            // Disable button and show loading state
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';
            verifyBtn.style.opacity = '0.7';

            // Call Mock API
            verifyOtpWithBackend(enteredOtp)
                .then((response) => {
                    localStorage.setItem('isLoggedIn', 'true');

                    // Check mode to determine redirection
                    const urlParams = new URLSearchParams(window.location.search);
                    const mode = urlParams.get('mode');

                    if (mode === 'register') {
                        window.location.href = 'register.html';
                    } else {
                        // Default to landing page for login
                        window.location.href = 'index.html';
                    }
                })
                .catch((error) => {
                    alert(error.message || 'Invalid OTP');
                    // Reset button
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify';
                    verifyBtn.style.opacity = '1';
                });
        });
    }


    const storedPhone = localStorage.getItem('phone');
    if (storedPhone) {
        console.log(`Verifying for: ${storedPhone}`);


    }
});

// --- MOCK API FUNCTION ---
// This simulates a call to your backend server to verify the OTP.
function verifyOtpWithBackend(otp) {
    return new Promise((resolve, reject) => {
        console.log(`[Mock API] Verifying OTP: ${otp}...`);

        // Simulate network delay (1.5 seconds)
        setTimeout(() => {
            // Simulate check (accept '123456' as the magic valid code for testing)
            if (otp === '123456') {
                resolve({ success: true, message: 'Verified' });
            } else {
                reject({ success: false, message: 'Invalid OTP. Try 123456' });
            }
        }, 1500);
    });
}
