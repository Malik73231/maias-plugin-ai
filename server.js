import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// basic protection so your key isn't spammed
app.use("/api/", rateLimit({ windowMs: 60_000, max: 30 }));

const OPENAI_KEY = "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";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(system, user) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.choices[0].message.content;
}

const SYS_MAP = `You are a Roblox terrain/scene planner.
Return ONLY JSON: {"terrain":[...], "assets":[...]}.
- terrain items like {"type":"mountain|island|river|waterfall|lake|plain","x":0,"z":0,"size":80,"height":50,"material":"Grass|Rock|Sand|Snow|Water"}
- assets items like {"name":"wooden_plank_bridge","assetId":123456,"x":0,"y":10,"z":0,"rotationY":0,"scale":1}
Stud units. No prose; valid JSON only.`;

const SYS_SCRIPT = `You are a Roblox Luau assistant. Output ONLY Luau code, no backticks, no explanations.`;

app.post("/api/map", async (req, res) => {
  try {
    const out = await callOpenAI(SYS_MAP, req.body.prompt || "");
    let json;
    try { json = JSON.parse(out); }
    catch { return res.status(422).json({ error: "INVALID_JSON", raw: out }); }
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: "MAP_FAIL", detail: String(e) });
  }
});

app.post("/api/script", async (req, res) => {
  try {
    const code = await callOpenAI(SYS_SCRIPT, req.body.prompt || "");
    res.json({ code });
  } catch (e) {
    res.status(500).json({ error: "SCRIPT_FAIL", detail: String(e) });
  }
});

app.get("/", (req, res) => res.send("MaiasPlugin AI is running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server on " + PORT));
