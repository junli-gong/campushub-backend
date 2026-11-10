import { randomUUID } from 'node:crypto';
import * as os from 'node:os';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { disconnectDatabase } from '../config/database';
import { seedResourcesIfMissing } from '../services/seed.service';
import { ResourceModel } from '../models/Resource.model';
import { ReservationModel } from '../models/Reservation.model';

// The MongoDB binary version is pinned in package.json (config.mongodbMemoryServer),
// so the install-time download and test runs use the same binary.
export function createTestReplicaSet(): Promise<MongoMemoryReplSet> {
  return MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
}
export interface TestDatabase {
  reset: () => Promise<void>;
  stop: () => Promise<void>;
}
export async function startTestDatabase(): Promise<TestDatabase> {
  const replicaSet = await createTestReplicaSet();
  const name = `campushub_test_${randomUUID().replaceAll('-', '')}`;
  try {
    // NODE-7832: Jest does not provide the driver's dynamic-import callback.
    // Supply the native OS adapter only in this isolated test connection.
    mongoose.set('bufferCommands', false);
    await mongoose.connect(replicaSet.getUri(), {
      dbName: name,
      serverSelectionTimeoutMS: 10000,
      runtimeAdapters: { os },
    });
  } catch (error: unknown) {
    await disconnectDatabase();
    await replicaSet.stop();
    throw error;
  }
  function assertOwnedDatabase(): void {
    if (mongoose.connection.name !== name)
      throw new Error('Refusing to modify an unowned database');
  }
  async function reset(): Promise<void> {
    assertOwnedDatabase();
    await ReservationModel.deleteMany({});
    await ResourceModel.deleteMany({});
    await seedResourcesIfMissing();
  }
  async function stop(): Promise<void> {
    try {
      assertOwnedDatabase();
      await mongoose.connection.dropDatabase();
    } finally {
      try {
        await disconnectDatabase();
      } finally {
        await replicaSet.stop();
      }
    }
  }
  return { reset, stop };
}
