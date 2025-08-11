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
    try {
        const r = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ]
            })
        });

        const data = await r.json();

        if (!r.ok) {
            console.error("OpenAI API Error:", data);
            throw new Error(data.error?.message || "Unknown API error");
        }

        return data.choices[0].message.content;
    } catch (err) {
        console.error("callOpenAI failed:", err);
        throw err;
    }
}

app.post("/api", async (req, res) => {
    try {
        const json = await callOpenAI("Map generator system", req.body.prompt || "");
        res.json({ reply: json });
    } catch (e) {
        console.error("Map generation failed:", e);
        res.status(500).json({ error: "MAP_FAIL", detail: String(e) });
    }
});

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
