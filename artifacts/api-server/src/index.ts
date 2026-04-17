import app from "./app";
import { logger } from "./lib/logger";
import { runAutoSeed } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Auto-seed the database on first boot if it's empty
try {
  await runAutoSeed();
} catch (err) {
  logger.warn({ err }, "[seed] Auto-seed failed — continuing startup anyway");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
