import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readVercelConfig(root) {
  try {
    const raw = await readFile(join(root, 'vercel.json'), 'utf8');
    const config = JSON.parse(raw);
    return {
      crons: Array.isArray(config.crons) ? config.crons : [],
      rewrites: Array.isArray(config.rewrites) ? config.rewrites : [],
      redirects: Array.isArray(config.redirects) ? config.redirects : [],
      headers: Array.isArray(config.headers) ? config.headers : [],
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw new Error(`Unable to read vercel.json: ${error.message}`);
  }
}
