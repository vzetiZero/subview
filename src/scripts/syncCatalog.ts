import { syncFrontendCatalog } from "../services/frontendSyncService";
import { env } from "../utils/env";

const summary = syncFrontendCatalog(env.frontendRoot);
console.log(JSON.stringify(summary, null, 2));
