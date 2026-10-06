import type { Server } from 'node:http';
import { once } from 'node:events';
import { app, initializeApplication } from './app';
import { readEnvironment } from './config/environment';
import { disconnectDatabase } from './config/database';

let server: Server | undefined;
let stopping = false;

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  try {
    if (server?.listening) {
      const timeout = setTimeout(
        (): void => server?.closeAllConnections(),
        5000,
      );
      timeout.unref();
      try {
        await new Promise<void>(
          (resolve: () => void, reject: (reason?: unknown) => void): void => {
            server?.close((error?: Error): void =>
              error ? reject(error) : resolve(),
            );
          },
        );
      } finally {
        clearTimeout(timeout);
      }
    }
  } finally {
    await disconnectDatabase();
  }
}

async function start(): Promise<void> {
  const config = readEnvironment();
  await initializeApplication(config);
  server = app.listen(config.port);
  await once(server, 'listening');
  console.log(`CampusHub backend listening on http://localhost:${config.port}`);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, (): void => {
      shutdown().catch((): void => {
        console.error('Shutdown failed.');
        process.exitCode = 1;
      });
    });
  }
}

start()
  .catch(async (error: unknown): Promise<void> => {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Startup failed: ${reason}`);
    process.exitCode = 1;
    await disconnectDatabase();
  })
  .catch((): void => {
    console.error('Database cleanup failed.');
    process.exitCode = 1;
  });
