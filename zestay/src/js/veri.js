document.addEventListener('DOMContentLoaded', () => {
    // Modal Elements
    const modal = document.getElementById('verificationModal');
    const btnVerify = document.querySelector('.btn-verify');
    const btnClose = document.querySelector('.modal-close-btn');
    const form = document.getElementById('verificationForm');

    // Open Modal
    if (btnVerify) {
        btnVerify.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    }

    // Close Modal Function
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // File Upload Handling
    const setupFileUpload = (dropZoneId, inputId) => {
        const dropZone = document.getElementById(dropZoneId);
        const input = document.getElementById(inputId);
        const preview = dropZone.querySelector('.file-preview');
        const placeholder = dropZone.querySelector('.upload-placeholder');

        if (!dropZone || !input) return;

        // Click to trigger input
        dropZone.addEventListener('click', () => input.click());

        // Handle file selection
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                handleFile(file, preview, placeholder, input);
            }
        });

        // Drag and Drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '#00C4B4', false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.borderColor = '#ddd', false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                input.files = files; // Update input files
                handleFile(files[0], preview, placeholder, input);
            }
        });
    };

    const handleFile = (file, preview, placeholder, input) => {
        // Validate type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-file-btn" title="Remove image">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            placeholder.style.display = 'none';

            // Remove functionality
            preview.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Stop click from triggering input
                input.value = ''; // Clear file input
                preview.innerHTML = ''; // Clear preview
                placeholder.style.display = 'block'; // Show placeholder
            });
        };
        reader.readAsDataURL(file);
    };

    // Setup Uploads
    setupFileUpload('drop-zone-front', 'id-front');
    setupFileUpload('drop-zone-back', 'id-back');
    setupFileUpload('drop-zone-selfie', 'selfie');

    // Form Submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Validation: Check if files are selected
            const idFront = document.getElementById('id-front').files[0];
            const idBack = document.getElementById('id-back').files[0];
            const selfie = document.getElementById('selfie').files[0];

            if (!idFront) {
                alert('Please upload the Front Side of your ID.');
                return;
            }
            if (!idBack) {
                alert('Please upload the Back Side of your ID.');
                return;
            }
            if (!selfie) {
                alert('Please upload your Selfie.');
                return;
            }

            // Backend Integration Placeholder
            const formData = new FormData();
            formData.append('name', document.getElementById('v-name').value);
            formData.append('mobile', document.getElementById('v-mobile').value);
            formData.append('email', document.getElementById('v-email').value);
            formData.append('idFront', idFront);
            formData.append('idBack', idBack);
            formData.append('selfie', selfie);

            // Simulation
            const btnSubmit = form.querySelector('.btn-submit');
            const originalText = btnSubmit.textContent;
            btnSubmit.textContent = 'Verifying...';
            btnSubmit.disabled = true;

            setTimeout(() => {
                // Success!
                alert('Verification Successful! You are now verified.');

                // Set Verified Status
                localStorage.setItem('isVerified', 'true');

                // Redirect to Landing Page to show badge and enable chat
                window.location.href = 'index.html';
            }, 1500);

            console.log('Form Data Ready for Backend:', Object.fromEntries(formData));
        });
    }
});
