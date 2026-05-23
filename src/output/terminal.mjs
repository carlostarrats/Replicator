export function renderDiff({ leftName, rightName, diff }) {
  const lines = [
    `Comparing ${leftName} and ${rightName}`,
    '',
    'Same:',
    ...formatList(diff.same),
    '',
    'Different:',
    ...formatList(diff.different),
    '',
    `Missing from ${leftName}:`,
    ...formatList(diff.missingFromLeft),
    '',
    `Missing from ${rightName}:`,
    ...formatList(diff.missingFromRight),
    '',
  ];

  return `${lines.join('\n')}`;
}

export function renderReadiness(readiness) {
  const lines = [
    `Deployment readiness: ${readiness.score}%`,
    '',
    'Ready:',
    ...formatList(readiness.ready),
    '',
    'Needs attention:',
    ...formatList(readiness.needsAttention),
    '',
    'Blocked:',
    ...formatList(readiness.blocked),
    '',
  ];

  return `${lines.join('\n')}`;
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

function formatList(items) {
  if (!items || items.length === 0) {
    return ['- None'];
  }
  return items.map((item) => `- ${item}`);
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
