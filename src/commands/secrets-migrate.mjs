import { readEnvFile } from '../analysis/read-env-file.mjs';
import { renderSections } from '../output/sections.mjs';
import { createProjectEnv } from '../vercel/client.mjs';
import { assertDryRunOrTestWrite } from './destructive-safety.mjs';

export async function migrateSecrets(options) {
  if (!options.fromProject || !options.toProject || !options.envFile || !options.keys?.length || !options.target) {
    throw new Error('Usage: vcopy secrets-migrate --from <source> --to <target> --env-file <path> --keys <keys> --target <target> [--dry-run|--test-project-only --apply --yes]');
  }

  assertDryRunOrTestWrite(options, [options.fromProject, options.toProject]);
  const values = await readEnvFile(options.envFile);
  const entries = options.keys.map((key) => {
    if (!values.has(key)) {
      throw new Error(`${key} was not found in ${options.envFile}.`);
    }
    return { key, target: options.target, value: values.get(key) };
  });

  if (!options.apply) {
    return renderSecretMigration('Secret migration plan', entries);
  }

  try {
    for (const entry of entries) {
      await createProjectEnv({
        apiBase: options.apiBase,
        token: options.token,
        teamId: options.teamId,
        idOrName: options.toProject,
        env: {
          key: entry.key,
          value: entry.value,
          target: [entry.target],
          type: 'encrypted',
        },
      });
    }
  } catch (error) {
    throw new Error(`Secret migration failed before completion. Review target env values for manual recovery. ${error.message}`);
  }

  return renderSecretMigration('Secret migration completed', entries);
}

function renderSecretMigration(title, entries) {
  return renderSections(title, [
    { title: 'Summary', items: entries.map((entry) => `${entry.key} - ${entry.target}`) },
    { title: 'Next steps', items: ['Add or verify secret values directly in Vercel; do not commit generated env files.'] },
  ]);
}
