import { once } from 'node:events';
import { app, initializeApplication } from '../src/app';
import { disconnectDatabase } from '../src/config/database';
import { seedResourcesIfMissing } from '../src/services/seed.service';
import { createTestReplicaSet } from '../src/test/setup';

async function start(): Promise<void> {
  const port = Number(process.argv[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Pass a valid E2E API port');

  const stopping = Promise.race([
    once(process, 'SIGINT'),
    once(process, 'SIGTERM'),
  ]);
  // Playwright signals the whole web-server group. Let this process stop MongoDB after closing HTTP.
  const replica = await createTestReplicaSet({ detached: true });
  try {
    await initializeApplication({
      port,
      mongodbUri: replica.getUri('campushub_test_e2e'),
      databaseTimeoutMs: 10_000,
    });
    await seedResourcesIfMissing();
    const server = app.listen(port, '127.0.0.1');
    await once(server, 'listening');
    await stopping;
    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  } finally {
    try {
      await disconnectDatabase();
    } finally {
      await replica.stop();
    }
  }
}

void start().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
