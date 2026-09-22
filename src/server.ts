import { app } from './app';

const configuredPort: string = process.env['PORT'] ?? '3000';
const port: number = Number(configuredPort);

if (
  !/^\d+$/.test(configuredPort) ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = app.listen(port);

server.on('listening', (): void => {
  console.log(`CampusHub backend listening on http://localhost:${port}`);
});

server.on('error', (error: Error): void => {
  console.error('Failed to start CampusHub backend:', error.message);
  process.exitCode = 1;
});
