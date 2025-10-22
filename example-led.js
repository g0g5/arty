const els = {
  baseUrl: document.getElementById("baseUrl"),
  key: document.getElementById("key"),
  model: document.getElementById("model"),
  prompt: document.getElementById("prompt"),
  out: document.getElementById("out"),
  send: document.getElementById("send"),

  ledStrip: document.getElementById("ledStrip"),
  demoAllOn: document.getElementById("demoAllOn"),
  demoAlt: document.getElementById("demoAlt"),
  demoLastOnly: document.getElementById("demoLastOnly"),
};

// ---------- Persistence ----------
chrome.storage.local.get(["OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL"], (res) => {
  if (res.OPENAI_BASE_URL) els.baseUrl.value = res.OPENAI_BASE_URL;
  if (res.OPENAI_API_KEY) els.key.value = res.OPENAI_API_KEY;
  if (res.OPENAI_MODEL) els.model.value = res.OPENAI_MODEL;
  if (!els.baseUrl.value) els.baseUrl.value = "https://api.openai.com";
  if (!els.model.value) els.model.value = "gpt-4o-mini";
});
for (const el of [els.baseUrl, els.key, els.model]) {
  el.addEventListener("change", async () => {
    await chrome.storage.local.set({
      OPENAI_BASE_URL: els.baseUrl.value.trim(),
      OPENAI_API_KEY: els.key.value.trim(),
      OPENAI_MODEL: els.model.value.trim(),
    });
  });
}

// ---------- LED helpers ----------
function setLed(idx, val) {
  const node = els.ledStrip.querySelector(`.led[data-idx="${idx}"]`);
  if (!node) return;
  node.classList.remove("red", "green");
  node.classList.add(val ? "green" : "red");
}
function setLeds(values) {
  // values: [0|1,0|1,0|1,0|1] length 4
  for (let i = 0; i < 4; i++) {
    setLed(i, values[i] ? 1 : 0);
  }
  return { ok: true, applied: values.map(v => v ? 1 : 0) };
}
// Default: all GREEN
setLeds([1,1,1,1]);

// Quick demo buttons (no network; calls local tool directly)
els.demoAllOn.addEventListener("click", () => setLeds([1,1,1,1]));
els.demoAlt.addEventListener("click", () => setLeds([1,0,1,0]));
els.demoLastOnly.addEventListener("click", () => setLeds([0,0,0,1]));

// ---------- Tool schema (OpenAI-compatible) ----------
const tools = [
  {
    type: "function",
    function: {
      name: "set_leds",
      description: "Set four LED indicators to green (1) or red (0).",
      parameters: {
        type: "object",
        properties: {
          values: {
            description: "Array of 4 integers, each 0 or 1. 1=green, 0=red.",
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "integer", enum: [0, 1] }
          }
        },
        required: ["values"],
        additionalProperties: false
      }
    }
  }
];

// System prompt nudging the model to use the tool
const SYSTEM_PROMPT = `
You control a panel with four LEDs. 
- Use the "set_leds" function whenever the user asks to set, toggle, or show a pattern for LEDs.
- The input must be exactly four digits (0 or 1). 1=green, 0=red.
- If the user gives natural language (e.g., "first three red, last green"), convert it to an array and CALL THE TOOL.
- After calling the tool, briefly acknowledge what you set.
`;

// ---------- Chat Completion with function/tool calling ----------
async function chatWithTools({ baseUrl, apiKey, model, userText }) {
  if (!baseUrl) throw new Error("Base URL is required.");
  if (!apiKey) throw new Error("API key is required.");
  if (!model) throw new Error("Model is required.");
  if (!userText) throw new Error("Prompt is empty.");

  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/v1/chat/completions`;

  // conversation for a single-shot demo
  const messages = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    { role: "user", content: userText }
  ];

  // 1) Initial call; let the model decide to call the tool
  const first = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,            // modern tool-calls
      tool_choice: "auto",
      // include legacy for some providers:
      // "functions": tools.map(t => t.function),
      // "function_call": "auto",
      temperature: 0
    }),
  });
  if (!first.ok) {
    const errText = await first.text().catch(() => "");
    throw new Error(`API error ${first.status}: ${errText || first.statusText}`);
  }
  const firstData = await first.json();
  const msg = firstData?.choices?.[0]?.message || {};

  // Handle modern tool_calls
  if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    const toolResults = [];

    for (const call of msg.tool_calls) {
      const name = call?.function?.name;
      const rawArgs = call?.function?.arguments ?? "{}";
      let args;
      try { args = JSON.parse(rawArgs); } catch { args = {}; }

      if (name === "set_leds") {
        const arr = Array.isArray(args.values) ? args.values.slice(0, 4) : [1,1,1,1];
        const normalized = arr.map(v => (v ? 1 : 0));
        // Apply locally (visual effect)
        const result = setLeds(normalized);
        toolResults.push({ tool_call_id: call.id, content: JSON.stringify(result) });
      } else {
        toolResults.push({ tool_call_id: call.id, content: JSON.stringify({ ok:false, error:`Unknown tool ${name}` }) });
      }
    }

    // 2) Send tool results back to get the assistant's final message
    const follow = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          ...messages,
          msg,
          ...toolResults.map(tr => ({ role: "tool", tool_call_id: tr.tool_call_id, content: tr.content }))
        ],
        tools,
        tool_choice: "none" // ask for a final assistant message
      }),
    });

    if (!follow.ok) {
      const errText = await follow.text().catch(() => "");
      throw new Error(`API error ${follow.status}: ${errText || follow.statusText}`);
    }
    const followData = await follow.json();
    return followData?.choices?.[0]?.message?.content ?? "(no assistant message)";
  }

  // Handle legacy function_call
  if (msg.function_call && msg.function_call.name) {
    const name = msg.function_call.name;
    let args = {};
    try { args = JSON.parse(msg.function_call.arguments || "{}"); } catch {}
    let result = { ok:false, error:"Unknown function" };

    if (name === "set_leds") {
      const arr = Array.isArray(args.values) ? args.values.slice(0, 4) : [1,1,1,1];
      result = setLeds(arr.map(v => (v ? 1 : 0)));
    }

    // Send function result (legacy role:function)
    const follow = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          ...messages,
          msg,
          { role: "function", name, content: JSON.stringify(result) }
        ],
        // legacy path:
        // "functions": tools.map(t => t.function),
        // "function_call": "none"
      }),
    });

    if (!follow.ok) {
      const errText = await follow.text().catch(() => "");
      throw new Error(`API error ${follow.status}: ${errText || follow.statusText}`);
    }
    const followData = await follow.json();
    return followData?.choices?.[0]?.message?.content ?? "(no assistant message)";
  }

  // If there was no tool call, just return the text content
  return msg?.content ?? "(no content)";
}

// ---------- UI wire-up ----------
els.send.addEventListener("click", async () => {
  els.out.textContent = "…thinking…";
  els.send.disabled = true;

  try {
    const cfg = await chrome.storage.local.get(["OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL"]);
    const text = await chatWithTools({
      baseUrl: (els.baseUrl.value || cfg.OPENAI_BASE_URL || "").trim(),
      apiKey: (els.key.value || cfg.OPENAI_API_KEY || "").trim(),
      model: (els.model.value || cfg.OPENAI_MODEL || "").trim(),
      userText: els.prompt.value.trim(),
    });
    els.out.textContent = text || "(empty response)";
  } catch (e) {
    els.out.textContent = e?.message ?? String(e);
  } finally {
    els.send.disabled = false;
  }
});
