// Simple chat widget interactions: toggle, list -> conversation, send
(function initChatWidget() {
  const chatWidget = document.getElementById('chatWidget');
  const toggleBtn = document.getElementById('chatToggleBtn');
  const closeBtn = document.getElementById('chatCloseBtn');
  const backBtn = document.getElementById('chatBackBtn');
  const headerAvatar = document.getElementById('chatHeaderAvatar');
  const chatTitle = document.getElementById('chatTitle');
  const chatStatus = document.getElementById('chatStatus');
  const listBody = document.getElementById('chatListBody');
  const convoBody = document.getElementById('chatConversationBody');
  const footer = document.getElementById('chatFooter');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  if (!chatWidget || !toggleBtn || !listBody) {
    // Page doesn't have the chat widget
    return;
  }

  // Demo data for list view
  const demoChats = [
    { id: 'u1', name: 'Priya', preview: 'Hi! Is this room available?', time: '2m', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya', online: true },
    { id: 'u2', name: 'Aman', preview: 'Can we schedule a visit?', time: '1h', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Aman', online: false },
    { id: 'u3', name: 'Sana', preview: 'Thanks for your response!', time: 'Yesterday', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sana', online: true },
  ];

  function renderList() {
    listBody.innerHTML = demoChats.map(c => `
      <div class="chat-item" data-id="${c.id}">
        <div class="chat-avatar-container">
          <img class="chat-avatar" src="${c.avatar}" alt="${c.name}">
          ${c.online ? '<span class="chat-status-dot"></span>' : ''}
        </div>
        <div class="chat-info">
          <span class="chat-name">${c.name}</span>
          <div class="chat-preview"><i class="fa-regular fa-message"></i> ${c.preview}</div>
        </div>
        <div class="chat-meta">${c.time}</div>
      </div>
    `).join('');
  }

  function openWidget() {
    chatWidget.classList.remove('closed');
  }

  function closeWidget() {
    chatWidget.classList.add('closed');
    showListView();
  }

  function showListView() {
    // Header
    backBtn.classList.add('hidden');
    headerAvatar.classList.add('hidden');
    chatTitle.textContent = 'Messages';
    chatStatus.textContent = '';
    // Bodies
    listBody.classList.remove('hidden');
    listBody.classList.add('list-view');
    convoBody.classList.add('hidden');
    // Footer
    footer.classList.add('hidden');
  }

  function showConversation(user) {
    backBtn.classList.remove('hidden');
    headerAvatar.src = user.avatar;
    headerAvatar.alt = user.name;
    headerAvatar.classList.remove('hidden');
    chatTitle.textContent = user.name;
    chatStatus.textContent = user.online ? 'Online' : 'Offline';

    listBody.classList.add('hidden');
    convoBody.classList.remove('hidden');
    footer.classList.remove('hidden');

    // Seed conversation if empty
    if (!convoBody.dataset.activeId || convoBody.dataset.activeId !== user.id) {
      convoBody.dataset.activeId = user.id;
      convoBody.innerHTML = `
        <div class="message them"><div class="message-content">Hey, I saw your listing!</div></div>
        <div class="message me"><div class="message-content">Hi ${user.name}, yes it's available.</div></div>
      `;
      scrollConversationToBottom();
    }
  }

  function scrollConversationToBottom() {
    convoBody.scrollTop = convoBody.scrollHeight;
  }

  function handleSend() {
    const text = (input.value || '').trim();
    if (!text) return;

    const bubble = document.createElement('div');
    bubble.className = 'message me';
    bubble.innerHTML = `<div class="message-content"></div>`;
    bubble.querySelector('.message-content').textContent = text;
    convoBody.appendChild(bubble);

    input.value = '';
    scrollConversationToBottom();

    // Simulated reply after a short delay
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'message them';
      reply.innerHTML = `<div class="message-content">Got it 👍</div>`;
      convoBody.appendChild(reply);
      scrollConversationToBottom();
    }, 600);
  }

  // Event bindings
  toggleBtn.addEventListener('click', openWidget);
  closeBtn && closeBtn.addEventListener('click', closeWidget);
  backBtn && backBtn.addEventListener('click', showListView);
  sendBtn && sendBtn.addEventListener('click', handleSend);
  input && input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Delegate clicks on list items
  listBody.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (!item) return;
    const id = item.getAttribute('data-id');
    const user = demoChats.find(c => c.id === id);
    if (user) showConversation(user);
  });

  // Initial render
  renderList();
  showListView();
})();
