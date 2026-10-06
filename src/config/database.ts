import mongoose from 'mongoose';

// Booking transactions need a replica set (setName) or a sharded cluster (mongos).
export function supportsTransactions(hello: unknown): boolean {
  return (
    typeof hello === 'object' &&
    hello !== null &&
    (('setName' in hello && typeof hello.setName === 'string') ||
      ('msg' in hello && hello.msg === 'isdbgrid'))
  );
}

export async function connectDatabase(
  uri: string,
  timeoutMs: number = 5000,
  databaseName?: string,
): Promise<void> {
  mongoose.set('bufferCommands', false);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: timeoutMs,
    connectTimeoutMS: timeoutMs,
    ...(databaseName === undefined ? {} : { dbName: databaseName }),
  });
  const db = mongoose.connection.db;
  if (db === undefined) throw new Error('MongoDB connection has no database');
  const hello: unknown = await db.admin().command({ hello: 1 });
  if (!supportsTransactions(hello)) {
    throw new Error(
      'MongoDB is not a replica set, so reservation transactions are unavailable. Run `npm run db:up`, or use a replica set or Atlas connection string.',
    );
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
