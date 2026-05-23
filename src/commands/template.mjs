import { normalizeTargets } from '../analysis/config-snapshot.mjs';
import { sanitizeProject } from '../analysis/sanitize.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { withSchema } from '../output/schema-version.mjs';

export async function createProjectTemplate(options) {
  const snapshot = await loadConfigSnapshot(options, options.project);
  const template = {
    kind: 'vercel-project-template',
    version: 1,
    sourceProject: snapshot.project.name || options.project,
    project: pickTemplateSettings(sanitizeProject(snapshot.project)),
    env: snapshot.envs
      .map((env) => ({
        key: env.key,
        target: normalizeTargets(env.target),
        type: env.type,
      }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    manualReview: [
      'Domains are not included and must be reviewed manually.',
      'Secret values are not included and must be entered directly in Vercel.',
      'Integration credentials are not included.',
    ],
  };

  return `${JSON.stringify(withSchema('template', template), null, 2)}\n`;
}

function pickTemplateSettings(project) {
  return {
    framework: project.framework,
    rootDirectory: project.rootDirectory,
    installCommand: project.installCommand,
    devCommand: project.devCommand,
    buildCommand: project.buildCommand,
    outputDirectory: project.outputDirectory,
    nodeVersion: project.nodeVersion,
    serverlessFunctionRegion: project.serverlessFunctionRegion,
  };
}
