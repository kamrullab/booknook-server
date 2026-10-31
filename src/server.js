import { createApp } from "./app.js";
import { closeDatabaseConnection, connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer() {
  await connectToDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`BookNook API listening on port ${env.PORT}`);
  });

  async function shutdown(signal) {
    console.info(`${signal} received; shutting down`);
    server.close(async () => {
      await closeDatabaseConnection();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Unable to start BookNook API", error);
  process.exit(1);
});
