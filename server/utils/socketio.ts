import { Server } from "socket.io";

let io: Server | null = null;
const activeStreams = new Map<string, { roomName: string; password: string }>();

export function initSocket(httpServer: any): Server {
  if (io) {
    console.log("⚙️ Socket.io already initialized. Returning existing instance.");
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log("⚙️ Socket.io Server initialized (Singleton).");

  io.on("connection", (socket) => {
    console.log(`[SOCKET.IO] New connection: ${socket.id}`);

    socket.on("join-lesson", ({ lessonId, email, role }) => {
      const room = `lesson:${lessonId}`;
      socket.join(room);
      console.log(`[SOCKET.IO] User ${email || 'anonymous'} (${role || 'student'}) joined room: ${room}`);

      // If there is an active stream for this room, send it to the joining user immediately
      const stream = activeStreams.get(room);
      if (stream) {
        console.log(`[SOCKET.IO] Instantly synced active Jitsi stream to late-joining user ${email}: ${stream.roomName}`);
        socket.emit("live-stream-ready", { roomName: stream.roomName, password: stream.password });
      }
    });

    socket.on("live-stream-ready", ({ lessonId, roomName, password }) => {
      const room = `lesson:${lessonId}`;
      activeStreams.set(room, { roomName, password });
      console.log(`[SOCKET.IO] Live stream ready in room ${room}: name ${roomName}, password ${password}`);
      // Broadcast this live stream config to all other clients in that specific room
      socket.to(room).emit("live-stream-ready", { roomName, password });
    });

    socket.on("slide-change", ({ lessonId, slideIndex }) => {
      const room = `lesson:${lessonId}`;
      console.log(`[SOCKET.IO] Slide change in room ${room}: index ${slideIndex}`);
      // Broadcast this index to all other clients in that specific room
      socket.to(room).emit("slide-change", { slideIndex });
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET.IO] Disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Keep original function name exported as an alias for backward compatibility
export function initSocketIOServer(httpServer: any): Server {
  return initSocket(httpServer);
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io has not been initialized yet. Please call initSocket(httpServer) first.");
  }
  return io;
}
