import { renderSections } from './sections.mjs';

export function renderDiff({ leftName, rightName, diff }) {
  return renderSections(`Comparing ${leftName} and ${rightName}`, [
    { title: 'Summary', items: [`${diff.same.length} same`, `${diff.different.length} different`] },
    { title: 'Same', items: diff.same },
    { title: 'Different', items: diff.different },
    { title: `Missing from ${leftName}`, items: diff.missingFromLeft },
    { title: `Missing from ${rightName}`, items: diff.missingFromRight },
    { title: 'Next steps', items: ['Review differences before copying settings or changing domains.'] },
  ]);
}

export function renderReadiness(readiness) {
  return renderSections(`Deployment readiness: ${readiness.score}%`, [
    { title: 'Summary', items: [`Deployment readiness: ${readiness.score}%`] },
    { title: 'Ready', items: readiness.ready },
    { title: 'Needs attention', items: readiness.needsAttention },
    { title: 'Blocked', items: readiness.blocked },
    { title: 'Next steps', items: readiness.blocked.length ? ['Resolve blocked items before deployment.'] : ['Continue with deployment verification.'] },
  ]);
}

export function renderDuplicatePlan(plan) {
  const lines = [
    `Duplicate plan for ${plan.targetProjectName}`,
    '',
    'This will:',
    `- Create project ${plan.targetProjectName}`,
    '- Copy build settings',
    `- Create environment variable placeholders for ${plan.envKeys.length} keys`,
    '',
    'Settings to copy:',
    ...formatSettings(plan.copiedSettings),
    '',
    'Environment variable placeholders:',
    ...formatList(plan.envKeys),
    '',
    'This will not:',
    ...formatList(plan.skipped),
    '',
    'Manual review needed:',
    ...formatList(plan.manualReview),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderDuplicateCreated({ plan, createdProject, sourceEnv }) {
  const lines = [
    'Duplicate created',
    '',
    `New project: ${createdProject.name || plan.targetProjectName}`,
    '',
    'Copied:',
    '- Build settings',
    '- Framework preset',
    '- Root directory',
    '',
    'Skipped:',
    ...formatList(plan.skipped),
    '',
    'Missing values checklist:',
    ...formatEnvInstructions(sourceEnv),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderEnvRefactorRecommendations(recommendations) {
  const lines = [
    'Shared env recommendations',
    '',
    'Good candidates for shared env vars:',
    ...formatList(recommendations.sharedCandidates),
    '',
    'Should remain project-specific:',
    ...formatList(recommendations.projectSpecific),
    '',
    'Scope drift:',
    ...formatList(recommendations.scopeDrift),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderDeploymentVerification({ deployment, classification }) {
  const target = deployment.target === 'production' ? 'Production' : 'Preview';
  const lines = [
    `${target} deployment failed`,
    '',
    classification.title,
    classification.summary,
    '',
    'Fix:',
    classification.fix,
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderTeams(teams) {
  const lines = [
    'Vercel teams',
    '',
    ...formatList(teams.map((team) => `${team.name || team.slug} - ${team.id}`)),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderProjects(projects) {
  const lines = [
    'Vercel projects',
    '',
    ...formatList(projects.map((project) => `${project.name} - ${project.id}`)),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderEnvPush(result) {
  const title = result.kind === 'pushed' ? 'Env values pushed' : 'Env push plan';
  const lines = [
    title,
    '',
    ...formatList(result.entries.map((entry) => `${entry.key} - ${entry.target}`)),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderEnvRemove(result) {
  const title = result.kind === 'removed' ? 'Env values removed' : 'Env remove plan';
  const lines = [
    title,
    '',
    ...formatList(result.entries.map((entry) => `${entry.key} - ${entry.target}`)),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderTeamOverview(overview) {
  const lines = [
    'Team config overview',
    '',
    `Projects analyzed: ${overview.projectCount}`,
    '',
    'Project groups:',
  ];

  for (const group of overview.groups) {
    lines.push(`- ${group.name}`);
    lines.push(`  Projects: ${group.projects.join(', ')}`);
    lines.push('  Drift signals:');
    for (const item of formatIndentedList(group.drift, 4)) {
      lines.push(item);
    }
  }

  lines.push('');
  lines.push('Shared env candidates:');
  lines.push(...formatList(overview.recommendations.sharedCandidates));
  lines.push('');
  lines.push('Project-specific envs:');
  lines.push(...formatList(overview.recommendations.projectSpecific));
  lines.push('');

  return `${lines.join('\n')}`;
}

function formatList(items) {
  if (!items || items.length === 0) {
    return ['- None'];
  }
  return items.map((item) => `- ${item}`);
}

function formatIndentedList(items, spaces) {
  const prefix = ' '.repeat(spaces);
  if (!items || items.length === 0) {
    return [`${prefix}- None`];
  }
  return items.map((item) => `${prefix}- ${item}`);
}

function formatSettings(settings) {
  return Object.entries(settings).map(([key, value]) => `- ${key}: ${value || 'not set'}`);
}

function formatEnvInstructions(envs) {
  if (!envs || envs.length === 0) {
    return ['- No environment variables detected'];
  }

  const lines = [];
  for (const env of [...envs].sort((left, right) => left.key.localeCompare(right.key))) {
    const targets = Array.isArray(env.target) ? env.target : [env.target].filter(Boolean);
    lines.push(`- ${env.key}`);
    for (const target of targets) {
      lines.push(`  vercel env add ${env.key} ${target}`);
    }
  }
  return lines;
}
