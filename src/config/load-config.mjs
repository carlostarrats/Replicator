import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateVcopyConfig } from '../validation/local-schemas.mjs';

export async function loadVcopyConfig(configPath) {
  if (!configPath) {
    return {};
  }

  const config = JSON.parse(await readFile(resolve(configPath), 'utf8'));
  validateVcopyConfig(config);
  return config;
}
