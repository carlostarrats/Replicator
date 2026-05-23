import { readFile } from 'node:fs/promises';
import { assertTestProjectWrite } from './destructive-safety.mjs';
import { createProject } from '../vercel/client.mjs';

export async function applyProjectTemplate(options) {
  if (!options.templateFile || !options.toProject) {
    throw new Error('Usage: vcopy template-apply --template <template.json> --to <target-project>');
  }

  const template = JSON.parse(await readFile(options.templateFile, 'utf8'));
  if (template.kind !== 'vercel-project-template') {
    throw new Error('Template file is not a vcopy Vercel project template.');
  }

  assertTestProjectWrite(options, [options.toProject]);

  const createdProject = await createProject({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    project: {
      name: options.toProject,
      ...(template.project || {}),
    },
  });

  return renderTemplateApply({
    targetProject: createdProject.name || options.toProject,
    env: template.env || [],
  });
}

function renderTemplateApply({ targetProject, env }) {
  return [
    'Template applied',
    '',
    `Project: ${targetProject}`,
    '',
    'Environment placeholders to add manually:',
    ...formatEnv(env),
    '',
  ].join('\n');
}

function formatEnv(env) {
  if (!env.length) {
    return ['- None'];
  }

  return env.map((item) => {
    const targets = (item.target || []).join(', ') || 'unknown';
    return `- ${item.key} (${targets})`;
  });
}
