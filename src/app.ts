import express from "express";
import session from "express-session";
import { adminRouter } from "./routes/admin";
import { apiRouter } from "./routes/api";
import { authRouter } from "./routes/auth";
import { frontendRouter } from "./routes/frontend";
import { syncFrontendCatalog } from "./services/frontendSyncService";
import { userRouter } from "./routes/user";
import { env, requireProductionSecret } from "./utils/env";

export function createApp() {
  requireProductionSecret();

  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  if (env.autoSyncFrontend) {
    syncFrontendCatalog(env.frontendRoot);
  }

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      name: env.sessionName,
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      unset: "destroy",
      proxy: env.trustProxy,
      cookie: {
        httpOnly: true,
        secure: env.sessionSecure,
        sameSite: env.sessionSameSite,
        maxAge: env.sessionMaxAgeMs,
        domain: env.sessionDomain,
      },
    })
  );

  app.use(authRouter);
  app.use(apiRouter);
  app.use(adminRouter);
  app.use(userRouter);
  app.use(frontendRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, message: "Not found" });
  });

  return app;
}
