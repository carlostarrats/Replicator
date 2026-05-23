import { readFile } from 'node:fs/promises';
import { renderSections } from '../output/sections.mjs';
import { withSchema } from '../output/schema-version.mjs';
import { validateTemplate } from '../validation/local-schemas.mjs';

export async function createTemplatePlan(options) {
  if (!options.templateFile) {
    throw new Error('Usage: vcopy template-plan --template <template.json> --to <target-project>');
  }
  if (!options.toProject) {
    throw new Error('Usage: vcopy template-plan --template <template.json> --to <target-project>');
  }

  const template = JSON.parse(await readFile(options.templateFile, 'utf8'));
  validateTemplate(template);

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
    return `${JSON.stringify(withSchema('template-plan', plan), null, 2)}\n`;
  }

  return renderTemplatePlan(plan);
}

function renderTemplatePlan(plan) {
  return renderSections(`Template plan for ${plan.targetProject}`, [
    { title: 'Summary', items: [`Source template: ${plan.sourceProject || 'unknown'}`] },
    { title: 'Settings', items: formatSettings(plan.settings).map((item) => item.replace(/^- /, '')) },
    { title: 'Environment variable placeholders', items: formatEnv(plan.env).map((item) => item.replace(/^- /, '')) },
    { title: 'Manual review needed', items: plan.manualReview },
    { title: 'Next steps', items: ['Review the plan before running any protected test apply command.'] },
  ]);
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
