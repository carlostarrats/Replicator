import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

export async function saveSnapshot(options) {
  if (!options.reportFile || !options.outDir) {
    throw new Error('Usage: vcopy snapshot-save --report <report.json> --out-dir <directory>');
  }

  const reportPath = resolve(options.reportFile);
  const outDir = resolve(options.outDir);
  const report = await readFile(reportPath, 'utf8');
  const ext = extname(reportPath) || '.json';
  const base = basename(reportPath, ext);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(outDir, `${base}-${timestamp}${ext}`);

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, report, 'utf8');

  return `Snapshot saved to ${outPath}\n`;
}
