import { normalizeTargets } from '../analysis/config-snapshot.mjs';
import { listProjectEnv, removeProjectEnv } from '../vercel/client.mjs';
import { assertDryRunOrTestWrite } from './destructive-safety.mjs';

export async function removeEnv(options) {
  if (!options.key) {
    throw new Error('Missing --key for env-rm.');
  }
  if (!options.target) {
    throw new Error('Missing --target for env-rm.');
  }

  assertDryRunOrTestWrite(options, [options.project]);

  const envs = await listProjectEnv({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    idOrName: options.project,
  });
  const matchingEntries = envs.filter((env) => env.key === options.key && normalizeTargets(env.target).includes(options.target));
  const unsafeEntries = matchingEntries.filter((env) => normalizeTargets(env.target).length > 1);
  if (unsafeEntries.length > 0) {
    throw new Error(`Refusing to remove ${options.key} for ${options.target} because the matching Vercel env entry has multiple targets. Remove or recreate it manually in Vercel.`);
  }

  const matches = matchingEntries
    .map((env) => ({ id: env.id, key: env.key, target: options.target }))
    .filter((env) => env.id);

  if (options.dryRun) {
    return { kind: 'plan', entries: matches };
  }

  if (!options.apply || !options.yes) {
    throw new Error('Refusing to remove env values without --apply --yes. Run --dry-run first.');
  }

  for (const match of matches) {
    await removeProjectEnv({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: options.project,
      envId: match.id,
    });
  }

  return { kind: 'removed', entries: matches };
}
