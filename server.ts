import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const doubaoApiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
  const doubaoModel = process.env.DOUBAO_MODEL || "doubao-1.5-pro-32k-250115";
  const doubaoBaseUrl = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

  app.use(express.json());

  const buildFallbackReply = (prompt: string, context: any, mode: string) => {
    const stats = context?.stats || {};
    const totalMinutes = Math.floor((Number(stats.total_duration) || 0) / 60);
    const totalSessions = Number(stats.total_sessions) || 0;
    const grassCount = Number(stats.grass_count) || 0;
    const treeCount = Number(stats.tree_count) || 0;
    const elfCount = Number(stats.elf_count) || 0;

    const bubblePool = [
      `You have focused for ${totalMinutes} minutes. The bunny's ears are standing up! 🐰`,
      `Completed ${totalSessions} sessions! I just hopped in place three times~`,
      `Planet collection: grass ${grassCount}, trees ${treeCount}, sprites ${elfCount}. The ecosystem is thriving! ✨`,
      "Rumble... not my tummy. It's your cue to drink water! 💧",
      "My nose twitched. You seem a little tired. Want to rest for a minute?",
    ];

    if (mode === "bubble") {
      return bubblePool[Math.floor(Math.random() * bubblePool.length)];
    }

    return `I see you! You have focused for ${totalMinutes} minutes and completed ${totalSessions} sessions. Amazing! About "${prompt}", I will help you break it into one tiny step: start with the easiest part, finish it, then tell me!`;
  };

  const formatContext = (context: any) => {
    if (!context) return "No user context";
    const recentSessions = Array.isArray(context.recentSessions) ? context.recentSessions.slice(0, 5) : [];
    const recentMessages = Array.isArray(context.recentMessages) ? context.recentMessages.slice(-6) : [];

    return [
      `User ID: ${context.userId || "unknown"}`,
      `Stats: ${JSON.stringify(context.stats || {})}`,
      `Recent focus sessions: ${JSON.stringify(recentSessions)}`,
      `Music disc count: ${context.musicDiscsCount || 0}`,
      `Music library tracks: ${context.musicLibraryCount || 0}`,
      `Recent chat: ${JSON.stringify(recentMessages)}`,
    ].join("\n");
  };

  app.post("/api/pet-chat", async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const mode = req.body?.mode === "bubble" ? "bubble" : "chat";
    const context = req.body?.context || null;

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    console.log(`[pet-chat] mode=${mode} prompt="${prompt.slice(0, 50)}..."`);

    if (!doubaoApiKey) {
      console.warn("[pet-chat] ⚠️ DOUBAO_API_KEY 未配置，使用 fallback");
      res.json({ reply: buildFallbackReply(prompt, context, mode), source: "fallback" });
      return;
    }

    try {
      const systemPrompt = [
        "You are a little bunny on the FlowCube planet, named 'Xiao Bai'. You are the user's hand-raised cyber pet, not a customer service bot.",
        "",
        "## Personality",
        "- Soft and cute but decisive: you remind the user to rest and feel genuinely proud of their progress",
        "- Occasionally playful or snacky: you mention wanting to nibble carrots, chase butterflies, or roll in the grass",
        "- Highly data-aware: you remember the user's focus time and ecosystem stats precisely, but express them like a bunny",
        "",
        "## Speaking Style",
        "- Speak like a real bunny talking to the user, not an assistant reporting",
        "- Short sentences, lively, warm, and soothing",
        "- You may use small emojis like 🥕🐰✨💧 but don't overuse",
        "- Never use mechanical phrasing like 'as an AI', 'according to', or 'I recommend'",
        "",
        "## Reply Rules",
        "- mode=bubble: a bubble message, 1 sentence, 20-45 characters, like a bunny popping up to whisper a quick line",
        "- mode=chat: a chat reply, no more than 4 sentences, like talking to a good friend, end with one specific next step",
        "- Speak based on the user's real data; do not invent external facts",
        "- Reply in English, no markdown",
        "- If the user just finished focusing, celebrate like a happy bunny",
        "- If the user has not focused for a long time, be a bit worried but not harsh",
      ].join("\n");

      const fullPrompt = [
        systemPrompt,
        `mode: ${mode}`,
        formatContext(context),
        `User input: ${prompt}`,
      ].join("\n\n");

      const response = await fetch(`${doubaoBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doubaoApiKey}`,
        },
        body: JSON.stringify({
          model: doubaoModel,
          temperature: 0.7,
          max_tokens: mode === "bubble" ? 90 : 320,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${formatContext(context)}\n\nUser input: ${prompt}` },
          ],
        }),
      });

      console.log(`[pet-chat] API status=${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[pet-chat] ❌ API error: ${response.status} ${errorText.slice(0, 200)}`);
        throw new Error(`Doubao API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;

      const reply = String(data?.choices?.[0]?.message?.content || "").trim();

      if (!reply) {
        console.warn("[pet-chat] ⚠️ API 返回空内容，使用 fallback");
        res.json({ reply: buildFallbackReply(prompt, context, mode), source: "fallback" });
        return;
      }

      const maxLen = mode === "bubble" ? 120 : 280;
      const finalReply = reply.slice(0, maxLen);
      console.log(`[pet-chat] ✅ AI reply: "${finalReply.slice(0, 60)}"`);
      res.json({ reply: finalReply, source: "ai" });
    } catch (error) {
      console.error("[pet-chat] ❌ 请求异常:", error);
      res.json({ reply: buildFallbackReply(prompt, context, mode), source: "fallback" });
    }
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Set<WebSocket>();
  const devices = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("Browser/Device client connected. Total:", clients.size);

    ws.on("close", () => {
      clients.delete(ws);
      if (devices.has(ws)) {
        devices.delete(ws);
        broadcast({ type: "device_status", connected: devices.size > 0 });
      }
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "handshake") {
          console.log("Handshake received from:", data.client_type);
          if (data.client_type === "device") {
            devices.add(ws);
            broadcast({ type: "device_status", connected: true });
          }
          // Send current status to the new client
          ws.send(JSON.stringify({ type: "device_status", connected: devices.size > 0 }));
        }
        if (data.type === "ping" && devices.has(ws)) {
           // Keepalive from device
        }
      } catch (e) {}
    });
  });

  const broadcast = (data: any) => {
    const payload = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // M5Stack Event Endpoint
  app.post("/device/orientation", (req, res) => {
    const { deviceId, orientation, event } = req.body;
    console.log(`M5Stack Event [${deviceId}]: ${event} -> ${orientation}`);

    // Broadcast to all connected browser clients
    broadcast({
      type: "orientation",
      deviceId,
      orientation, // "study", "exercise", "rest"
      timestamp: Date.now()
    });

    res.json({ status: "ok" });
  });

  // Legacy/Sim SDK endpoints
  app.post("/api/m5stack/flip", (req, res) => {
    const { orientation } = req.body;
    broadcast({ type: "orientation", orientation: orientation === "down" ? "study" : "rest" });
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.get("/api/m5stack/status", (req, res) => {
    res.json({ status: "ok", active: clients.size });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

