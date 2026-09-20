import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/** Serve only the verified static build on an OS-assigned loopback port. */
export async function serveBuild(directory: string) {
  const root = path.resolve(directory);
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      let filename = path.resolve(root, '.' + pathname);
      if (!filename.startsWith(root + path.sep) && filename !== root) {
        response.writeHead(403).end();
        return;
      }
      if (!path.extname(pathname) && !pathname.startsWith('/api/'))
        filename = path.join(root, 'index.html');
      const body = await readFile(filename);
      response.writeHead(200, {
        'content-type': mime[path.extname(filename)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No benchmark server address');
  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
