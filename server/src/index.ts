import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes        from "./routes/auth.js";
import companiesRoutes   from "./routes/companies.js";
import modulesRoutes     from "./routes/modules.js";
import invitationsRoutes from "./routes/invitations.js";
import adminRoutes       from "./routes/admin.js";
import developerRoutes   from "./routes/developer.js";
import tenantHubRoutes   from "./routes/tenantHub.js";
import ocorrenciasRoutes from "./routes/ocorrencias.js";
import escalaRoutes      from "./routes/escala.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "256kb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Muitas tentativas. Aguarde 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Muitas requisições. Tente novamente em breve." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── API Routes ────────────────────────────────────────────────────────────────
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
app.use("/api/ocorrencias", ocorrenciasRoutes);
app.use("/api/escala",      escalaRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Frontend estático (produção) ──────────────────────────────────────────────
const publicDir = path.resolve(__dirname, "../../public");
app.use(express.static(publicDir));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`HubSolutions → http://localhost:${PORT}`);
});
