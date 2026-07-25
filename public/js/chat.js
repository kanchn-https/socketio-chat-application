const chatNamespace = io("/chat", {
  auth: {
    token: 123456,
  },
});

// Query DOM Elements
const messageInput = document.getElementById("messageInput");
const chatForm = document.getElementById("chatForm");
const chatBox = document.getElementById("chat-box");
const feedback = document.getElementById("feedback");
const onlineUsers = document.getElementById("online-users-list");
const chatContainer = document.getElementById("chatContainer");
const pvChatForm = document.getElementById("pvChatForm");
const pvMessageInput = document.getElementById("pvMessageInput");
const modalTitle = document.getElementById("modalTitle");
const pvChatMessage = document.getElementById("pvChatMessage");
const roomNameDisplay = document.getElementById("room-name-display");

// User Credentials from LocalStorage
const nickname = localStorage.getItem("nickname") || "Anonymous";
const roomNumber = localStorage.getItem("chatroom") || "room1";
let socketId;

// Redirect to login if nickname missing
if (!localStorage.getItem("nickname")) {
  window.location.replace("/index.html");
}

// Display Clean Room Name
const roomNames = {
  room1: "General Room 1",
  room2: "Developers Room 2",
  room3: "Lounge Room 3",
};
if (roomNameDisplay) {
  roomNameDisplay.textContent = roomNames[roomNumber] || roomNumber;
}

// Emit Login Event
chatNamespace.emit("login", { nickname, roomNumber });

// Handle Chat Message Submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    chatNamespace.emit("chat message", {
      message: msg,
      nickname,
      roomNumber,
    });
    messageInput.value = "";
  }
});

// Handle Private Chat Submit
pvChatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pvMsg = pvMessageInput.value.trim();

  if (pvMsg) {
    chatNamespace.emit("pvChat", {
      message: pvMsg,
      name: nickname,
      to: socketId,
      from: chatNamespace.id,
    });

    const modalEl = document.getElementById("pvChat");
    if (window.bootstrap && window.bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modalInstance.hide();
    } else if (typeof $ !== "undefined") {
      $("#pvChat").modal("hide");
    }
    pvMessageInput.value = "";
  }
});

// Helper to escape HTML characters
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Socket Listener: Receive Chat Messages
chatNamespace.on("chat message", (data) => {
  feedback.innerHTML = "";
  const isSelf = data.nickname === nickname;
  const initial = (data.nickname || "?").charAt(0).toUpperCase();

  const messageHtml = `
    <li class="chat-message-item ${isSelf ? "self" : ""}">
      <div class="chat-message-avatar">${initial}</div>
      <div class="chat-message-content">
        <div class="chat-message-header">
          <span class="chat-message-author">${escapeHTML(data.nickname)}</span>
          <span class="chat-message-time">${escapeHTML(data.date || "")}</span>
        </div>
        <div class="chat-message-bubble">
          ${escapeHTML(data.message)}
        </div>
      </div>
    </li>
  `;

  chatBox.innerHTML += messageHtml;
  chatContainer.scrollTop = chatContainer.scrollHeight;
});

// Socket Listener: Typing Event
let typingTimeout;
messageInput.addEventListener("keypress", (e) => {
  if (e.key !== "Enter") {
    chatNamespace.emit("typing", { name: nickname, roomNumber });
  }
});

chatNamespace.on("typing", (data) => {
  if (roomNumber == data.roomNumber && data.name !== nickname) {
    feedback.innerHTML = `
      <i class="fa-solid fa-pen-nib" style="font-size: 11px;"></i>
      <span>${escapeHTML(data.name)} is typing</span>
      <span class="typing-pulse-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    `;

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      feedback.innerHTML = "";
    }, 3500);
  }
});

// Socket Listener: Private Chat Message Received
chatNamespace.on("pvChat", (data) => {
  socketId = data.from;
  if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-lock" style="color: #FF7A1A; margin-right: 8px;"></i> Direct Message from ${escapeHTML(data.name)}`;
  
  if (pvChatMessage) {
    pvChatMessage.style.display = "block";
    pvChatMessage.innerHTML = `<strong>${escapeHTML(data.name)}:</strong> ${escapeHTML(data.message)}`;
  }

  const modalEl = document.getElementById("pvChat");
  if (window.bootstrap && window.bootstrap.Modal) {
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
  } else if (typeof $ !== "undefined") {
    $("#pvChat").modal("show");
  }
});

// Socket Listener: Online Users List Update
chatNamespace.on("online", (data) => {
  if (!onlineUsers) return;
  onlineUsers.innerHTML = "";

  data.forEach((user) => {
    if (roomNumber == user.roomNumber) {
      const isMe = user.id === chatNamespace.id;
      const initial = (user.name || "?").charAt(0).toUpperCase();

      const userPill = `
        <li>
          <button 
            type="button" 
            class="online-user-pill" 
            data-bs-toggle="modal" 
            data-bs-target="#pvChat" 
            data-toggle="modal" 
            data-target="#pvChat" 
            data-id="${user.id}" 
            data-client="${escapeHTML(user.name)}"
            ${isMe ? "disabled" : ""}
            title="${isMe ? "You" : "Click to send private message"}"
          >
            <span class="user-status-dot"></span>
            <span class="user-avatar-initial">${initial}</span>
            <span>${escapeHTML(user.name)}${isMe ? " (You)" : ""}</span>
          </button>
        </li>
      `;
      onlineUsers.innerHTML += userPill;
    }
  });
});

// jQuery / Bootstrap Modal Show Event Setup
if (typeof $ !== "undefined") {
  $("#pvChat").on("show.bs.modal", function (e) {
    var button = $(e.relatedTarget);
    if (button && button.data("client")) {
      var user = button.data("client");
      socketId = button.data("id");

      if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-paper-plane" style="color: #FF7A1A; margin-right: 8px;"></i> Direct Message to ${escapeHTML(user)}`;
      if (pvChatMessage) pvChatMessage.style.display = "none";
    }
  });
}
