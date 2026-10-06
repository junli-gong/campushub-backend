import { readEnvironment } from '../config/environment';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { seedResourcesIfMissing } from '../services/seed.service';

async function seed(): Promise<void> {
  try {
    const config = readEnvironment();
    await connectDatabase(config.mongodbUri, config.databaseTimeoutMs);
    await seedResourcesIfMissing();
    console.log('Missing demo resources inserted; existing records preserved.');
  } finally {
    await disconnectDatabase();
  }
}

seed().catch((error: unknown): void => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Seeding failed: ${reason}`);
  process.exitCode = 1;
});
