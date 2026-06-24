import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import db from "../db/database.js";

interface CustomWebSocket extends WebSocket {
  isAlive?: boolean;
  liveSessionId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

export function initWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  console.log("⚙️ WebSocket Server initialized.");

  // Heartbeat to clear stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: CustomWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", (ws: CustomWebSocket, request: IncomingMessage) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    console.log("[SOCKET] New connection established.");

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message);
        const { type, data } = payload;

        switch (type) {
          case "join_room": {
            const { liveSessionId, userEmail, userName, userRole } = data;
            ws.liveSessionId = Number(liveSessionId);
            ws.userEmail = userEmail;
            ws.userName = userName || userEmail;
            ws.userRole = userRole || "student";

            console.log(`[SOCKET] User ${ws.userName} (${ws.userRole}) joined Room LiveSession:${ws.liveSessionId}`);

            // Send current active challenge (if any) or history
            try {
              const activeChallenge = db.prepare(`
                SELECT id, title, description_markdown, starter_code, duration_seconds, pushed_at, is_active
                FROM live_challenges
                WHERE live_session_id = ? AND is_active = 1
                LIMIT 1
              `).get(ws.liveSessionId) as any;

              if (activeChallenge) {
                ws.send(JSON.stringify({
                  type: "challenge_pushed",
                  data: {
                    challenge: {
                      id: activeChallenge.id,
                      title: activeChallenge.title,
                      description_markdown: activeChallenge.description_markdown,
                      starter_code: activeChallenge.starter_code,
                      duration_seconds: activeChallenge.duration_seconds,
                      pushed_at: activeChallenge.pushed_at
                    }
                  }
                }));
              }

              sendLeaderboardToRoom(ws.liveSessionId);
            } catch (dbErr: any) {
              console.error("[SOCKET] Failed fetching initial session state on join:", dbErr.message);
            }
            break;
          }

          case "push_challenge": {
            if (ws.userRole !== "instructor" && ws.userRole !== "admin") {
              ws.send(JSON.stringify({ type: "error", message: "Forbidden: Only instructors can push live challenges." }));
              return;
            }

            const { liveSessionId, title, description_markdown, starter_code, duration_seconds } = data;
            const nowIso = new Date().toISOString();

            try {
              db.prepare("UPDATE live_challenges SET is_active = 0 WHERE live_session_id = ?").run(Number(liveSessionId));

              const info = db.prepare(`
                INSERT INTO live_challenges (live_session_id, title, description_markdown, starter_code, duration_seconds, pushed_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
              `).run(Number(liveSessionId), title, description_markdown, starter_code, Number(duration_seconds) || 120, nowIso);

              const challengeId = info.lastInsertRowid;

              console.log(`[SOCKET] Live Challenge pushed for session ${liveSessionId}: ID ${challengeId}`);

              const broadcastPayload = JSON.stringify({
                type: "challenge_pushed",
                data: {
                  challenge: {
                    id: challengeId,
                    title,
                    description_markdown,
                    starter_code,
                    duration_seconds: Number(duration_seconds) || 120,
                    pushed_at: nowIso
                  }
                }
              });

              wss.clients.forEach((client: CustomWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.liveSessionId === ws.liveSessionId) {
                  client.send(broadcastPayload);
                }
              });

              sendLeaderboardToRoom(ws.liveSessionId!);
            } catch (dbErr: any) {
              console.error("[SOCKET] Failed to push challenge to DB:", dbErr.message);
              ws.send(JSON.stringify({ type: "error", message: "Failed to push challenge: " + dbErr.message }));
            }
            break;
          }

          case "submit_solution": {
            const { challengeId, durationSecondsTaken, status, submittedCode } = data;
            const nowIso = new Date().toISOString();

            try {
              const challenge = db.prepare("SELECT live_session_id, is_active FROM live_challenges WHERE id = ?").get(Number(challengeId)) as any;
              
              if (!challenge) {
                ws.send(JSON.stringify({ type: "error", message: "Active challenge not found." }));
                return;
              }

              db.prepare(`
                INSERT INTO live_challenge_submissions (live_challenge_id, student_email, student_name, duration_seconds_taken, submitted_at, status, submitted_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                Number(challengeId),
                ws.userEmail || "anonymous@mountech.academy",
                ws.userName || "Anonymous Student",
                Number(durationSecondsTaken),
                nowIso,
                status,
                submittedCode || ""
              );

              console.log(`[SOCKET] Student ${ws.userEmail} submitted solution: ${status}`);

              sendLeaderboardToRoom(challenge.live_session_id);
            } catch (dbErr: any) {
              console.error("[SOCKET] Solution save failed:", dbErr.message);
              ws.send(JSON.stringify({ type: "error", message: "Submission failed to record: " + dbErr.message }));
            }
            break;
          }

          case "end_challenge": {
            if (ws.userRole !== "instructor" && ws.userRole !== "admin") {
              ws.send(JSON.stringify({ type: "error", message: "Forbidden: Only instructors can end challenges." }));
              return;
            }

            const { challengeId } = data;
            try {
              db.prepare("UPDATE live_challenges SET is_active = 0 WHERE id = ?").run(Number(challengeId));
              
              const broadcastPayload = JSON.stringify({
                type: "challenge_ended",
                data: { challengeId }
              });

              wss.clients.forEach((client: CustomWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.liveSessionId === ws.liveSessionId) {
                  client.send(broadcastPayload);
                }
              });
            } catch (dbErr: any) {
              console.error("[SOCKET] Failed to end challenge:", dbErr.message);
            }
            break;
          }

          case "chat_message": {
            const { body } = data;
            const broadcastPayload = JSON.stringify({
              type: "chat_message",
              data: {
                id: Date.now(),
                userEmail: ws.userEmail || "anonymous@mountech.academy",
                userName: ws.userName || "Anonymous Student",
                userRole: ws.userRole || "student",
                body,
                timestamp: new Date().toISOString()
              }
            });

            wss.clients.forEach((client: CustomWebSocket) => {
              if (client.readyState === WebSocket.OPEN && client.liveSessionId === ws.liveSessionId) {
                client.send(broadcastPayload);
              }
            });
            break;
          }

          default:
            console.warn("[SOCKET] Unknown message type:", type);
            break;
        }
      } catch (err: any) {
        console.error("[SOCKET] Error processing websocket message:", err.message);
      }
    });

    ws.on("close", () => {
      console.log(`[SOCKET] Connection closed for user ${ws.userName || "unknown"}`);
    });
  });

  // Upgrade plumbing on request
  server.on("upgrade", (request: any, socket: any, head: any) => {
    try {
      const url = request.url || "";
      if (url.includes("/socket.io/")) {
        // Let socket.io handle its own websocket upgrades
        return;
      }
    } catch (err) {
      console.warn("[WEBSOCKET] Error checking upgrade URL path:", err);
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  function sendLeaderboardToRoom(liveSessionId: number) {
    try {
      const submissions = db.prepare(`
        SELECT 
          s.id,
          s.student_email,
          s.student_name,
          s.duration_seconds_taken,
          s.submitted_at,
          s.status,
          c.title as challenge_title,
          c.id as challenge_id
        FROM live_challenge_submissions s
        JOIN live_challenges c ON s.live_challenge_id = c.id
        WHERE c.live_session_id = ?
        ORDER BY s.status ASC, s.duration_seconds_taken ASC
      `).all(liveSessionId) as any[];

      const payload = JSON.stringify({
        type: "leaderboard_update",
        data: {
          submissions: submissions.map(sub => ({
            id: sub.id,
            challengeId: sub.challenge_id,
            challengeTitle: sub.challenge_title,
            studentEmail: sub.student_email,
            studentName: sub.student_name,
            durationSecondsTaken: sub.duration_seconds_taken,
            submittedAt: sub.submitted_at,
            status: sub.status
          }))
        }
      });

      wss.clients.forEach((client: CustomWebSocket) => {
        if (client.readyState === WebSocket.OPEN && client.liveSessionId === liveSessionId) {
          client.send(payload);
        }
      });
    } catch (err: any) {
      console.error("[SOCKET] Failed to compute/broadcast leaderboard statistics:", err);
    }
  }

  return wss;
}
