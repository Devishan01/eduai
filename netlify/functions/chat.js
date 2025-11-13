// netlify/functions/chat.js
// Netlify function to proxy requests to the Gemini generateContent endpoint.
// Expects your Gemini API key set as an environment variable: GEMINI_API_KEY (or GOOGLE_API_KEY).

export async function handler(event) {
  try {
    if (!event || !event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    let incoming;
    try {
      incoming = JSON.parse(event.body);
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON in request body", details: parseErr.message }),
      };
    }

    // Pick up API key from env (recommended: set GEMINI_API_KEY in Netlify UI)
    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server misconfiguration: GEMINI_API_KEY not set" }),
      };
    }

    // Allow the frontend to optionally supply model, otherwise use a safe default
    const model = incoming.model || "gemini-1.5-flash-latest";

    // Build the request body in the format Gemini expects:
    // { "contents": [ { "parts": [ { "text": "..." } ], "role": "user" }, ... ] }
    // Support two common incoming shapes:
    // 1) { prompt: "..." }
    // 2) { messages: [{ role: "user"|"assistant"|"system", content: "..." }, ...] }
    // 3) If the frontend already provided a "contents" array, pass it through.

    let requestBody;
    if (Array.isArray(incoming.contents)) {
      requestBody = { ...incoming }; // trust caller if they provided full contents object
    } else if (Array.isArray(incoming.messages)) {
      const contents = incoming.messages.map((m) => {
        // allow both { content } or { text }
        const text = typeof m.content === "string" ? m.content : (typeof m.text === "string" ? m.text : "");
        const out = { parts: [{ text }] };
        if (m.role) out.role = m.role;
        return out;
      });
      requestBody = { ...incoming, contents };
      delete requestBody.messages;
    } else if (typeof incoming.prompt === "string") {
      requestBody = {
        ...incoming,
        contents: [{ parts: [{ text: incoming.prompt }] }],
      };
      delete requestBody.prompt;
    } else {
      // Fallback: if body looked like {text: "..."} or top-level string
      const possibleText = incoming.text || incoming.input || "";
      if (possibleText) {
        requestBody = {
          contents: [{ parts: [{ text: String(possibleText) }] }],
        };
      } else {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Request must include `prompt`, `messages`, or `contents`" }),
        };
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;
    // Use header x-goog-api-key as recommended in docs
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    // Try to parse JSON safely; if non-JSON, return raw text with diagnostics
    const text = await res.text(); // always read as text first

    console.log("Gemini raw response:", text);

    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (jsonErr) {
      // Non-JSON response (HTML error page, empty, etc). Return diagnostics.
      return {
        statusCode: res.status || 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Non-JSON response from Gemini API",
          status: res.status,
          statusText: res.statusText,
          raw: text ? (text.length > 1000 ? text.slice(0, 1000) + "...(truncated)" : text) : null,
        }),
      };
    }

    // If Gemini returned HTTP error status but valid JSON, forward it with same status
    if (!res.ok) {
      return {
        statusCode: res.status || 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Gemini API returned an error", status: res.status, body: payload }),
      };
    }

    // Success - return the Gemini JSON directly to frontend
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    console.error("Error in Netlify function /chat:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error", details: String(error && error.message ? error.message : error) }),
    };
  }
}
