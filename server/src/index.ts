import express from "express";
import cors from "cors";
import authRoutes        from "./routes/auth.js";
import companiesRoutes   from "./routes/companies.js";
import modulesRoutes     from "./routes/modules.js";
import invitationsRoutes from "./routes/invitations.js";
import adminRoutes       from "./routes/admin.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth",        authRoutes);
app.use("/api/companies",   companiesRoutes);
app.use("/api/modules",     modulesRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/admin",       adminRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`HubSolutions API → http://localhost:${PORT}`);
  console.log(`DB Tier: local PostgreSQL (hubsolutions) + Supabase routing`);
});
