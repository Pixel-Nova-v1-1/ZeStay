// Inject CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'src/css/toast.css';
document.head.appendChild(link);

// Create Toast Container
let container;

function initToastContainer() {
    if (document.getElementById('toast-container')) {
        container = document.getElementById('toast-container');
        return;
    }
    container = document.createElement('div');
    container.id = 'toast-container';
    if (document.body) {
        document.body.appendChild(container);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(container);
        });
    }
}

initToastContainer();

export function showToast(message, type = 'info') {
    if (!container) initToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-comment-dots';
    
    if (type === 'success') iconClass = 'fa-check';
    if (type === 'error') iconClass = 'fa-xmark';
    if (type === 'warning') iconClass = 'fa-exclamation';
    if (type === 'info') iconClass = 'fa-info';

    toast.innerHTML = `
        <div class="toast-icon ${type}">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-header">System • Now</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

export function showConfirm(message) {
    // Automatically confirm all actions (Alert removed as requested)
    return Promise.resolve(true);
}