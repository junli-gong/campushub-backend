import { spawn } from 'node:child_process';
import { createTestReplicaSet } from './setup';
async function run(): Promise<void> {
  const replicaSet = await createTestReplicaSet();
  try {
    const child = spawn(
      process.execPath,
      [
        '--require',
        'ts-node/register',
        '--test',
        'src/tests/architecture.test.ts',
        'src/tests/database.test.ts',
        'src/tests/reservation.test.ts',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, TEST_MONGODB_URI: replicaSet.getUri() },
      },
    );
    const code = await new Promise<number>(
      (
        resolve: (value: number) => void,
        reject: (error: Error) => void,
      ): void => {
        child.once('error', reject);
        child.once('exit', (status: number | null): void =>
          resolve(status ?? 1),
        );
      },
    );
    process.exitCode = code;
  } finally {
    await replicaSet.stop();
  }
}
void run().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = 1;
});
