// script.js — EduAI Gemini Chat (working version, Nov 2025)
// IMPORTANT: Replace API_KEY with your AI Studio key and keep it private.
const API_KEY = "AIzaSyA86duWcfjgDDKfEQWjvWwoexHw7gEbjzQ"; // <-- paste your Gemini AI Studio key here (do NOT share)

const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const noteEl = document.getElementById("note");

function appendMessage(text, who = "ai") {
  const div = document.createElement("div");
  div.className = "bubble " + (who === "user" ? "user" : "ai");
  const safeText = text ? String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
  div.innerHTML = `<div>${safeText}</div><div class='meta'>${new Date().toLocaleTimeString()} • ${who === "user" ? "You" : "EduAI"}</div>`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function showTyping() {
  const t = document.createElement("div");
  t.className = "bubble ai typing";
  t.id = "typing";
  t.innerHTML = '<div class="typing"></div><div class="meta">EduAI is typing...</div>';
  chatEl.appendChild(t);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

// ✅ Updated endpoint — current valid one (v1beta1)
async function callGeminiDirect(promptText) {
  const url = "/api/chat";

  const body = {
    contents: [{ parts: [{ text: promptText }] }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.output?.[0]?.content?.map((c) => c.text || "").join("") ||
    "No response from Gemini.";
  return text;
}

async function ask(promptText) {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    noteEl.textContent =
      "Please paste your Gemini AI Studio API key into script.js (do NOT share it publicly).";
    return;
  }
  appendMessage(promptText, "user");
  showTyping();
  try {
    const reply = await callGeminiDirect(promptText);
    hideTyping();
    appendMessage(reply, "ai");
    noteEl.textContent = "";
  } catch (err) {
    hideTyping();
    appendMessage("Error: " + err.message, "ai");
    if (err.message.toLowerCase().includes("api key not valid")) {
      noteEl.textContent =
        "Invalid API key. Create one at https://aistudio.google.com/app/apikey and paste it into script.js.";
    } else if (err.message.toLowerCase().includes("failed to fetch")) {
      noteEl.textContent =
        "Network/CORS error: Browser blocked the request. Try Chrome on Android or use a local server (like VS Code Live Server).";
    } else {
      noteEl.textContent = "See console for details.";
    }
    console.error(err);
  }
}

sendBtn.addEventListener("click", () => {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = "";
  ask(text);
});

promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Welcome message
appendMessage("Hello! I'm EduAI (Gemini 1.5 Flash). Ask me anything 🙂", "ai");
