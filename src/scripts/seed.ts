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

seed().catch((): void => {
  console.error(
    'Seeding failed. Check MongoDB availability and configuration.',
  );
  process.exitCode = 1;
});
