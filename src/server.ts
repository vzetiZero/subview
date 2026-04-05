import { createApp } from "./app";
import { databasePath } from "./db";
import { env } from "./utils/env";

const app = createApp();

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Admin/User panel listening on ${env.appBaseUrl}`);
  console.log(`Using database: ${databasePath}`);
  console.log(`Using frontend root: ${env.frontendRoot}`);
  console.log(`Node environment: ${env.nodeEnv}`);
});
