// ✅ script.js — Final EduAI Chat (Netlify backend version, November 2025)

// IMPORTANT: No API key is used here in frontend (key is hidden in Netlify function)
const chatEl = document.getElementById("chat");
const promptEl = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const noteEl = document.getElementById("note");

// ---------------------- UI Functions ---------------------- //
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

// ---------------------- Gemini Call Function ---------------------- //
async function callGeminiDirect(promptText) {
  const body = {
    contents: [{ parts: [{ text: promptText }] }],
  };

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), // send user message to backend
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";
    return text;
  } catch (err) {
    console.error("Error in callGeminiDirect:", err);
    throw err;
  }
}

// ---------------------- Main Ask Function ---------------------- //
async function ask(promptText) {
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
    if (err.message.toLowerCase().includes("failed to fetch")) {
      noteEl.textContent =
        "Network or server error. Try reloading the page or check Netlify backend.";
    } else {
      noteEl.textContent = "Something went wrong. See console for details.";
    }
  }
}

// ---------------------- Event Listeners ---------------------- //
sendBtn.addEventListener("click", () => {
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = "";
  ask(text);
});

promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ---------------------- Initial Greeting ---------------------- //
appendMessage("Hello! 👋 I'm EduAI (Gemini powered). Ask me anything about school, science, or life!", "ai");
