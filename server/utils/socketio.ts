import { Server } from "socket.io";

export function initSocketIOServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log("⚙️ Socket.io Server initialized.");

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
