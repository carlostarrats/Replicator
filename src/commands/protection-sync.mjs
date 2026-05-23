import { getProject, updateProject } from '../vercel/client.mjs';
import { assertDryRunOrTestWrite } from './destructive-safety.mjs';

export async function syncProtection(options) {
  if (!options.fromProject || !options.toProject) {
    throw new Error('Usage: vcopy protection-sync --from <source> --to <target> [--dry-run|--test-project-only --apply --yes]');
  }

  assertDryRunOrTestWrite(options, [options.fromProject, options.toProject]);
  const source = await getProject({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    idOrName: options.fromProject,
  });
  const patch = {
    gitForkProtection: source.gitForkProtection,
    ssoProtection: source.ssoProtection,
    autoExposeSystemEnvs: source.autoExposeSystemEnvs,
  };

  if (!options.apply) {
    return renderProtection('Deployment protection sync plan', patch);
  }

  await updateProject({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    idOrName: options.toProject,
    project: patch,
  });

  return renderProtection('Deployment protection synced', patch);
}

function renderProtection(title, patch) {
  return [
    title,
    '',
    `- gitForkProtection: ${formatValue(patch.gitForkProtection)}`,
    `- ssoProtection: ${formatValue(patch.ssoProtection)}`,
    `- autoExposeSystemEnvs: ${formatValue(patch.autoExposeSystemEnvs)}`,
    '- bypass secrets: skipped',
    '',
  ].join('\n');
}

function formatValue(value) {
  return value === null || value === undefined ? 'not set' : String(value);
}
