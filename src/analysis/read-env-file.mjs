import { readFile } from 'node:fs/promises';

export async function readEnvFile(path) {
  const content = await readFile(path, 'utf8');
  const values = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = stripQuotes(line.slice(equalsIndex + 1).trim());
    if (key) {
      values.set(key, value);
    }
  }

  return values;
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
