import { readFile } from 'node:fs/promises';

export async function createTemplatePlan(options) {
  if (!options.templateFile) {
    throw new Error('Usage: vcopy template-plan --template <template.json> --to <target-project>');
  }
  if (!options.toProject) {
    throw new Error('Usage: vcopy template-plan --template <template.json> --to <target-project>');
  }

  const template = JSON.parse(await readFile(options.templateFile, 'utf8'));
  if (template.kind !== 'vercel-project-template') {
    throw new Error('Template file is not a vcopy Vercel project template.');
  }

  const plan = {
    targetProject: options.toProject,
    sourceProject: template.sourceProject,
    settings: template.project || {},
    env: template.env || [],
    manualReview: [
      ...(template.manualReview || []),
      'This command does not call Vercel or create projects.',
    ],
  };

  if (options.format === 'json') {
    return `${JSON.stringify(plan, null, 2)}\n`;
  }

  return renderTemplatePlan(plan);
}

function renderTemplatePlan(plan) {
  return [
    `Template plan for ${plan.targetProject}`,
    '',
    `Source template: ${plan.sourceProject || 'unknown'}`,
    '',
    'Settings:',
    ...formatSettings(plan.settings),
    '',
    'Environment variable placeholders:',
    ...formatEnv(plan.env),
    '',
    'Manual review needed:',
    ...formatList(plan.manualReview),
    '',
  ].join('\n');
}

function formatSettings(settings) {
  const entries = Object.entries(settings).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) {
    return ['- None'];
  }
  return entries.map(([key, value]) => `- ${key}: ${value}`);
}

function formatEnv(envs) {
  if (!envs.length) {
    return ['- None'];
  }
  return envs.map((env) => `- ${env.key} - ${(env.target || []).join(', ')}`);
}

function formatList(items) {
  if (!items.length) {
    return ['- None'];
  }
  return items.map((item) => `- ${item}`);
}
