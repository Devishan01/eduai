// netlify/functions/chat.js
export async function handler(event) {
  const API_KEY = "AIzaSyA86duWcfjgDDKfEQWjvWwoexHw7gEbjzQ"; // paste your Gemini API key here

  try {
    const body = JSON.parse(event.body);

    // ✅ use Node18+ native fetch (no import needed)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
