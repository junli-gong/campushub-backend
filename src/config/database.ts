import mongoose from 'mongoose';

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
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
