export interface Environment {
  port: number;
  mongodbUri: string;
  databaseTimeoutMs: number;
}

export function readEnvironment(): Environment {
  const rawPort = process.env['PORT'] ?? '3000';
  const port = Number(rawPort);
  if (
    !/^\d+$/.test(rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const mongodbUri = process.env['MONGODB_URI'];
  if (!mongodbUri || !/^mongodb(?:\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error('MONGODB_URI must be set to a MongoDB connection string');
  }
  return { port, mongodbUri, databaseTimeoutMs: 5000 };
}

export function readTestDatabaseUri(): string {
  const uri = process.env['TEST_MONGODB_URI'];
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error(
      'Set TEST_MONGODB_URI to a MongoDB replica set for integration tests',
    );
  }
  return uri;
}
