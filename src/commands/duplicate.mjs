import { createDuplicatePlan } from '../analysis/duplicate-plan.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { readVercelConfig } from '../analysis/read-vercel-config.mjs';
import { sanitizeEnv, sanitizeProject } from '../analysis/sanitize.mjs';
import { createProject } from '../vercel/client.mjs';

export async function duplicateProject(options) {
  const snapshot = await loadConfigSnapshot(options, options.fromProject);
  const vercelConfig = options.codeRoot
    ? await readVercelConfig(options.codeRoot)
    : undefined;
  const plan = createDuplicatePlan({ ...snapshot, vercelConfig }, options.toProject);

  if (!options.dryRun && !options.apply) {
    return { kind: 'plan', plan, needsMode: true };
  }

  if (options.dryRun) {
    return { kind: 'plan', plan };
  }

  if (!options.yes) {
    throw new Error('Refusing to apply without confirmation. Re-run with --yes after reviewing the dry-run plan.');
  }

  const createdProject = await createProject({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    project: {
      name: plan.targetProjectName,
      framework: plan.copiedSettings.framework,
      rootDirectory: plan.copiedSettings.rootDirectory,
      installCommand: plan.copiedSettings.installCommand,
      devCommand: plan.copiedSettings.devCommand,
      buildCommand: plan.copiedSettings.buildCommand,
      outputDirectory: plan.copiedSettings.outputDirectory,
    },
  });

  return {
    kind: 'created',
    plan,
    createdProject: sanitizeProject(createdProject),
    sourceEnv: snapshot.envs.map(sanitizeEnv),
  };
}
