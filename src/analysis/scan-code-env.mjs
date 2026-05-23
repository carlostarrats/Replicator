import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ENV_REFERENCE = /process\.env\.([A-Z0-9_]+)/g;
const SCANNED_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const SKIPPED_DIRS = new Set(['.git', '.next', '.vercel', 'node_modules', 'dist', 'build', 'coverage']);

export async function scanCodeEnvReferences(root) {
  const refs = new Map();
  await walk(root, root, refs);
  return [...refs.entries()]
    .map(([key, files]) => ({ key, files: [...files].sort() }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

async function walk(root, current, refs) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        await walk(root, path, refs);
      }
      continue;
    }

    if (!entry.isFile() || !isScannedFile(entry.name)) {
      continue;
    }

    const fileStat = await stat(path);
    if (fileStat.size > 1024 * 1024) {
      continue;
    }

    const content = await readFile(path, 'utf8');
    for (const match of content.matchAll(ENV_REFERENCE)) {
      const key = match[1];
      const files = refs.get(key) || new Set();
      files.add(relative(root, path));
      refs.set(key, files);
    }
  }
}

function isScannedFile(name) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex !== -1 && SCANNED_EXTENSIONS.has(name.slice(dotIndex));
}
