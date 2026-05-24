import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DOT_ENV_REFERENCE = /process\.env\.([A-Z0-9_]+)/g;
const BRACKET_ENV_REFERENCE = /process\.env\[['"`]([A-Z0-9_]+)['"`]\]/g;
const DESTRUCTURED_ENV_REFERENCE = /\b(?:const|let|var)\s*{([^}]+)}\s*=\s*process\.env/g;
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
    recordMatches(refs, relative(root, path), content.matchAll(DOT_ENV_REFERENCE));
    recordMatches(refs, relative(root, path), content.matchAll(BRACKET_ENV_REFERENCE));
    recordDestructuredMatches(refs, relative(root, path), content.matchAll(DESTRUCTURED_ENV_REFERENCE));
  }
}

function recordMatches(refs, file, matches) {
  for (const match of matches) {
    recordRef(refs, match[1], file);
  }
}

function recordDestructuredMatches(refs, file, matches) {
  for (const match of matches) {
    for (const part of match[1].split(',')) {
      const key = part.trim().split(':')[0].split('=')[0].trim();
      if (/^[A-Z0-9_]+$/.test(key)) {
        recordRef(refs, key, file);
      }
    }
  }
}

function recordRef(refs, key, file) {
  const files = refs.get(key) || new Set();
  files.add(file);
  refs.set(key, files);
}

function isScannedFile(name) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex !== -1 && SCANNED_EXTENSIONS.has(name.slice(dotIndex));
}
