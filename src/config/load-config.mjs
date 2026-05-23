import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadVcopyConfig(configPath) {
  if (!configPath) {
    return {};
  }

  return JSON.parse(await readFile(resolve(configPath), 'utf8'));
}
