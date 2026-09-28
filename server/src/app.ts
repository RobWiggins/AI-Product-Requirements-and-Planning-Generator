import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { attachUser } from "./auth/middleware";
import { router } from "./routes";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

// Behind a reverse proxy in production so `secure` cookies work over TLS termination.
if (config.isProd) app.set("trust proxy", 1);

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api", router);

app.use(errorHandler);
