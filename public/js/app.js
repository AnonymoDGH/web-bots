const tabs = document.querySelectorAll("#sidebar button");
const tabContents = document.querySelectorAll("#content > div");

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const targetTab = tab.getAttribute("tab");
        tabContents.forEach((content) => (content.hidden = content.getAttribute("tab") !== targetTab));
    });
});

document.querySelectorAll('input[type="range"]').forEach(input => {
    const label = document.querySelector(`label[for="${input.id}"]`);
    
    input.addEventListener('input', () => {
        label.textContent = input.value;
    });
});

const socket = io();

function connectBot() {
    const hostValue = document.getElementById("data-host").value;
    const portValue = document.getElementById("data-port").value;
    const nicknameValue = document.getElementById("data-nickname").value;
    const versionValue = document.getElementById("data-version").value;

    socket.emit("con", nicknameValue, hostValue, portValue, versionValue);
};

function mineStart() {
    socket.emit("mineStart", document.getElementById("data-block-id").value);
};

function come() {
    const targetNickname = document.getElementById("data-come-target").value;
    const radius = document.getElementById("data-come-radius").value;

    socket.emit("come", targetNickname, radius);
};

function follow() {
    const targetNickname = document.getElementById("data-follow-target").value;

    socket.emit("follow", targetNickname);
};

function gotopos() {
    const x = document.getElementById("data-goto-x").value;
    const y = document.getElementById("data-goto-y").value;
    const z = document.getElementById("data-goto-z").value;

    socket.emit("goto", x, y, z);
};

function autoarmor() {
    socket.emit("autoarmor", document.getElementById("data-autoarmor").checked);
};

function selectSlot() {
    socket.emit("selectSlot", document.getElementById("data-slot").value);
};

function say() {
    socket.emit("say", document.getElementById("data-message").value);
};

socket.on('chat message', (data) => {
 displayChat(data.username, data.message);
});

function displayChat(username, message) {
 const chatHistory = document.getElementById('chat-history');
 const newMessage = document.createElement('div');
 newMessage.textContent = `${username}: ${message}`;
 chatHistory.appendChild(newMessage);
}