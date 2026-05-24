import { readEnvFile } from '../analysis/read-env-file.mjs';
import { createProjectEnv } from '../vercel/client.mjs';
import { assertDryRunOrTestWrite } from './destructive-safety.mjs';

export async function pushEnv(options) {
  if (!options.envFile) {
    throw new Error('Usage: vcopy env-push <project> --env-file <path> --keys <keys> --target <target> [--dry-run|--apply]');
  }
  if (!options.keys?.length) {
    throw new Error('Missing --keys for env-push.');
  }
  if (!options.target) {
    throw new Error('Missing --target for env-push.');
  }

  assertDryRunOrTestWrite(options, [options.project]);

  const values = await readEnvFile(options.envFile);
  const entries = options.keys.map((key) => {
    if (!values.has(key)) {
      throw new Error(`${key} was not found in ${options.envFile}.`);
    }
    return { key, value: values.get(key), target: options.target };
  });

  if (options.dryRun) {
    return { kind: 'plan', entries: entries.map(redactEntry) };
  }

  if (!options.apply || !options.yes) {
    throw new Error('Refusing to push env values without --apply --yes. Run --dry-run first.');
  }

  const created = [];
  for (const entry of entries) {
    await createProjectEnv({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: options.project,
      env: {
        key: entry.key,
        value: entry.value,
        target: [entry.target],
        type: 'encrypted',
      },
    });
    created.push(redactEntry(entry));
  }

  return { kind: 'pushed', entries: created };
}

function redactEntry(entry) {
  return {
    key: entry.key,
    target: entry.target,
  };
}
