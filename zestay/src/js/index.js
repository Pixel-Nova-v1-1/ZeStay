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


        const landingProfileBtn = document.getElementById('landingProfileBtn');
        if (landingProfileBtn) {
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
                const data = JSON.parse(storedProfile);
                let imgSrc = 'https://api.dicebear.com/9.x/avataaars/svg?seed=User'; // Default

                if (data.profileOption === 'upload' && data.uploadedAvatar) {
                    imgSrc = data.uploadedAvatar;
                } else if (data.profileOption === 'avatar' && data.avatarId) {
                    if (!data.avatarId.startsWith('http')) {
                        imgSrc = `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.avatarId}`;
                    } else {
                        imgSrc = data.avatarId;
                    }
                }

                let badgeHtml = '';
                if (localStorage.getItem('isVerified') === 'true') {
                    // Blue Verified Badge (FontAwesome Stack)
                    badgeHtml = `
                    <span class="fa-stack" style="font-size: 8px; position: absolute; bottom: 0; right: -5px;">
                        <i class="fa-solid fa-certificate fa-stack-2x" style="color: #2196F3;"></i>
                        <i class="fa-solid fa-check fa-stack-1x" style="color: white;"></i>
                    </span>`;
                }

                landingProfileBtn.style.position = 'relative'; // Ensure relative positioning for badge
                landingProfileBtn.innerHTML = `
                    <img src="${imgSrc}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
                    ${badgeHtml}
                `;
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('isVerified'); // Clear verification status
            window.location.reload();
        });
    }

    const btnProfile = document.querySelector('.btn-profile');
    if (btnProfile) {
        btnProfile.addEventListener('click', () => {
            window.location.href = 'profile.html';
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Chat Widget Logic ---
    const chatWidget = document.getElementById('chatWidget');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatBackBtn = document.getElementById('chatBackBtn');
    const chatListBody = document.getElementById('chatListBody');
    const chatConversationBody = document.getElementById('chatConversationBody');
    const chatFooter = document.getElementById('chatFooter');
    const chatTitle = document.getElementById('chatTitle');
    const chatStatus = document.getElementById('chatStatus');
    const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    // Mock Backend API - Backend Developers: Replace these returns with actual API calls
    const backendAPI = {
        // Mock verification status. Set to 'true' to simulate verified user, 'false' for unverified.
        checkVerification: () => {
            // Backend: Fetch user verification status (e.g., GET /api/user/verification-status)
            // For demo purposes, we'll check localStorage or default to false
            return localStorage.getItem('isVerified') === 'true';
        },
        getChats: () => {
            // Backend: Fetch list of active chats for the logged-in user
            return [
                { id: 1, name: "Aditya", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aditya", lastMsg: "Hey! Is the room still available?", time: "10:30 AM", unread: 2, online: true },
            ];
        },
        getMessages: (chatId) => {
            // Backend: Fetch message history for a specific chatId
            return [
                { id: 1, sender: "them", text: "Hi there! I saw your listing." },
                { id: 2, sender: "me", text: "Hello! Yes, it's still available." },
                { id: 3, sender: "them", text: "Great! When can I come see it?" },
                { id: 4, sender: "me", text: "I'm free this weekend. Does Saturday work?" }
            ];
        },
        sendMessage: (chatId, text) => {
            console.log(`Sending message to chat ${chatId}: ${text}`);
            // Backend: Send POST request to /api/messages
            return Promise.resolve({ success: true, text: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        }
    };

    let activeChatId = null;


    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => {
            chatWidget.classList.toggle('closed');
            if (!chatWidget.classList.contains('closed') && !activeChatId) {
                renderChatList();
            }
        });
    }

    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', () => {
            chatWidget.classList.add('closed');
        });
    }

    function renderChatList() {
        chatListBody.innerHTML = '';

        // 1. Check Verification
        const isVerified = backendAPI.checkVerification();

        if (!isVerified) {
            // Show Verification Warning
            chatListBody.innerHTML = `
                <div class="chat-verification-warning">
                    <i class="fa-solid fa-shield-halved chat-verification-icon"></i>
                    <h4 class="chat-verification-title">Account Not Verified</h4>
                    <p class="chat-verification-text">To chat with other users, you need to verify your account first.</p>
                    <a href="veri.html" class="chat-verification-btn">Verify Now</a>
                </div>
            `;
            // Reset header just in case
            if (chatHeaderAvatar) chatHeaderAvatar.classList.add('hidden');
            chatTitle.textContent = "Messages";
            chatStatus.textContent = "";
            chatFooter.classList.add('hidden'); // Ensure footer is hidden

            // Ensure we are in list view mode (body visible)
            chatListBody.classList.remove('hidden');
            chatConversationBody.classList.add('hidden');
            return;
        }

        // 2. Render Chats if Verified
        const chats = backendAPI.getChats();

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <div class="chat-avatar-container">
                    <img src="${chat.avatar}" alt="${chat.name}" class="chat-avatar">
                    ${chat.online ? '<span class="chat-status-dot"></span>' : ''}
                </div>
                <div class="chat-info">
                    <span class="chat-name">${chat.name}</span>
                    <span class="chat-preview" style="${chat.unread > 0 ? 'font-weight:bold; color:black;' : ''}">
                        ${chat.unread > 0 ? '<i class="fa-solid fa-check" style="color:#00C4B4; margin-right:4px;"></i>' : '<i class="fa-solid fa-check-double" style="color:#00C4B4; margin-right:4px;"></i>'} 
                        ${chat.lastMsg}
                    </span>
                </div>
                <div class="chat-meta">
                    <span class="chat-time">${chat.time}</span>
                    ${chat.unread > 0 ? `<div style="background:#ff3b30; color:white; border-radius:50%; width:18px; height:18px; display:flex; justify-content:center; align-items:center; margin-left:auto; margin-top:4px;">${chat.unread}</div>` : ''}
                </div>
            `;
            chatItem.addEventListener('click', () => openChat(chat));
            chatListBody.appendChild(chatItem);
        });


        chatListBody.classList.remove('hidden');
        chatConversationBody.classList.add('hidden');
        chatFooter.classList.add('hidden');
        chatBackBtn.classList.add('hidden');
        if (chatHeaderAvatar) chatHeaderAvatar.classList.add('hidden');
        chatTitle.textContent = "Messages";
        chatStatus.textContent = "";
        activeChatId = null;
    }

    function openChat(chat) {
        activeChatId = chat.id;

        chatTitle.textContent = chat.name;
        chatStatus.textContent = chat.online ? "Online" : "Offline";
        chatBackBtn.classList.remove('hidden');
        if (chatHeaderAvatar) {
            chatHeaderAvatar.src = chat.avatar;
            chatHeaderAvatar.classList.remove('hidden');
        }

        chatListBody.classList.add('hidden');
        chatConversationBody.classList.remove('hidden');
        chatFooter.classList.remove('hidden');
        renderMessages(chat.id);
    }

    if (chatBackBtn) {
        chatBackBtn.addEventListener('click', renderChatList);
    }

    function renderMessages(chatId) {
        chatConversationBody.innerHTML = '';
        const messages = backendAPI.getMessages(chatId);

        messages.forEach(msg => {
            addMessageBubble(msg.text, msg.sender);
        });
        scrollToBottom();
    }

    function addMessageBubble(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.innerHTML = `
            <div class="message-content">${text}</div>
        `;
        chatConversationBody.appendChild(msgDiv);
    }

    function scrollToBottom() {
        chatConversationBody.scrollTop = chatConversationBody.scrollHeight;
    }

    if (chatSendBtn && chatInput) {
        const handleSend = () => {
            const text = chatInput.value.trim();
            if (text && activeChatId) {

                addMessageBubble(text, 'me');
                scrollToBottom();
                chatInput.value = '';


                backendAPI.sendMessage(activeChatId, text).then(res => {

                });
            }
        };

        chatSendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});
