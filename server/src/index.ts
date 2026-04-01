import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes        from "./routes/auth.js";
import companiesRoutes   from "./routes/companies.js";
import modulesRoutes     from "./routes/modules.js";
import invitationsRoutes from "./routes/invitations.js";
import adminRoutes       from "./routes/admin.js";
import developerRoutes   from "./routes/developer.js";
import tenantHubRoutes   from "./routes/tenantHub.js";

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "256kb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máx 20 tentativas por IP
  message: { error: "Muitas tentativas. Aguarde 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120,
  message: { error: "Muitas requisições. Tente novamente em breve." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api",               apiLimiter);

app.use("/api/auth",        authRoutes);
app.use("/api/companies",   companiesRoutes);
app.use("/api/modules",     modulesRoutes);
app.use("/api/invitations", invitationsRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/developer",   developerRoutes);
app.use("/api/hub",         tenantHubRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`HubSolutions API → http://localhost:${PORT}`);
});
