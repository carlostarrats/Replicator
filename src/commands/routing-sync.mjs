import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function syncRouting(options) {
  if (!options.fromConfig || !options.toConfig) {
    throw new Error('Usage: vcopy routing-sync --from-config <source-vercel.json> --to-config <target-vercel.json> [--dry-run|--test-project-only --apply --yes]');
  }

  if (!options.dryRun && (!options.apply || !options.yes || !options.testProjectOnly)) {
    throw new Error('Refusing to mutate routing config without --test-project-only --apply --yes.');
  }

  const source = JSON.parse(await readFile(resolve(options.fromConfig), 'utf8'));
  const target = JSON.parse(await readFile(resolve(options.toConfig), 'utf8'));
  const next = {
    ...target,
    crons: source.crons || [],
    rewrites: source.rewrites || [],
    redirects: source.redirects || target.redirects,
  };

  if (options.apply) {
    await writeFile(resolve(options.toConfig), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  }

  return [
    options.apply ? 'Routing config synced' : 'Routing config sync plan',
    '',
    `- crons: ${(source.crons || []).length}`,
    `- rewrites: ${(source.rewrites || []).length}`,
    `- redirects: ${(source.redirects || []).length}`,
    '',
  ].join('\n');
}
