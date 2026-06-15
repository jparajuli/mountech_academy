import express from "express";
import dns from "dns";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";

// Prefer IPv4 for local container stability
dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(express.json());

// Main Modular Routes Registration
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api", courseRoutes); // maps /api/enroll, /api/complete, /api/ratings, etc.
app.use("/api", instructorRoutes); // maps /api/instructors, /api/instructors/:id, etc.

export default app;
