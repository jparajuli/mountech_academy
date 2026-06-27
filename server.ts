import path from "path";
import { createServer as createViteServer } from "vite";
import express from "express";
import app from "./server/app.js";
import { runMigration } from "./server/db/migrate.js";
import { runCleanupAndIndexOptimization } from "./server/db/cleanup.js";
import { startLiveSessionReminderScheduler } from "./server/utils/reminderScheduler.js";
import http from "http";
import { initWebSocketServer } from "./server/utils/websocket.js";
import { initSocket } from "./server/utils/socketio.js";

const PORT = 3000;

async function start() {
  // 1. Run database initialization and json-to-sqlite conversions on boot
  try {
    runMigration();
    runCleanupAndIndexOptimization();
    // Start automated 15-minute live class scheduled email reminders background worker
    startLiveSessionReminderScheduler();
  } catch (err: any) {
    console.error("Critical: Database migration failed on startup:", err.message);
  }

  const httpServer = http.createServer(app);
  initWebSocketServer(httpServer);
  initSocket(httpServer);

  // 2. Attach Vite middleware in dev or static asset servers in production
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Modular Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
