import { Server } from "socket.io";

let io: Server | null = null;

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
