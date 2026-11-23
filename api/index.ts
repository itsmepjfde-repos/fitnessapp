import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server.ts';

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  appPromise ??= createApp();
  const app = await appPromise;
  app(req, res);
}
