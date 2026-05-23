export function renderAnalysisReport({ project, envs, domains = [], codeEnvRefs = [], vercelConfig, likelyServices = [] }) {
  const lines = [
    '# Vercel Project Analysis Report',
    '',
    'This report contains configuration metadata only. It does not include secret contents.',
    '',
    '## Project',
    '',
    `- Project: ${project.name || project.id || 'unknown'}`,
    `- Framework: ${project.framework || 'not set'}`,
    `- Repository: ${formatRepository(project.gitRepository)}`,
    `- Root directory: ${project.rootDirectory || 'not set'}`,
    `- Install command: ${project.installCommand || 'not set'}`,
    `- Build command: ${project.buildCommand || 'not set'}`,
    `- Output directory: ${project.outputDirectory || 'not set'}`,
    '',
    '## Project Settings',
    '',
    `- Node version: ${project.nodeVersion || 'not set'}`,
    `- Serverless function region: ${project.serverlessFunctionRegion || 'not set'}`,
    `- Git fork protection: ${formatEnabled(project.gitForkProtection)}`,
    `- SSO protection: ${formatProtection(project.ssoProtection)}`,
    `- Auto-expose system envs: ${formatEnabled(project.autoExposeSystemEnvs)}`,
    `- Web analytics: ${project.webAnalytics ? 'enabled' : 'disabled'}`,
    '',
    '## Environment Variables',
    '',
  ];

  if (envs.length === 0) {
    lines.push('- None detected');
  } else {
    for (const env of sortEnv(envs)) {
      lines.push(`- ${env.key} - ${formatTargets(env.target)} (${env.type || 'unknown'})`);
    }
  }

  lines.push('', '## Likely Services', '');
  if (likelyServices.length === 0) {
    lines.push('- None detected');
  } else {
    for (const service of likelyServices) {
      lines.push(`- ${service}`);
    }
  }

  lines.push('', '## Domains', '');
  if (domains.length === 0) {
    lines.push('- None detected');
  } else {
    for (const domain of sortDomains(domains)) {
      lines.push(`- ${domain.name} - ${domain.verified ? 'verified' : 'not verified'}`);
    }
  }

  const missingCodeRefs = missingCodeEnvRefs(envs, codeEnvRefs);
  lines.push('', '## Referenced in Code but Missing in Vercel', '');
  if (missingCodeRefs.length === 0) {
    lines.push('- None detected');
  } else {
    for (const ref of missingCodeRefs) {
      lines.push(`- ${ref.key} - ${ref.files.join(', ')}`);
    }
  }

  lines.push('', '## Vercel Config File', '');
  if (!vercelConfig) {
    lines.push('- No vercel.json detected');
  } else {
    const configLines = formatVercelConfig(vercelConfig);
    lines.push(...(configLines.length > 0 ? configLines : ['- No crons or routing rules detected']));
  }

  lines.push(
    '',
    '## Skipped',
    '',
    '- Secret contents',
    '- Domains',
    '- Integration credentials',
    '- Any project mutations',
    '',
    '## Next Steps',
    '',
    '1. Review the listed keys and scopes.',
    '2. Add missing secret contents directly in Vercel.',
    '3. Re-run analysis after setup changes.',
    '',
  );

  return `${lines.join('\n')}`;
}

function formatRepository(gitRepository) {
  if (!gitRepository) {
    return 'not connected';
  }
  return gitRepository.repo || gitRepository.url || 'connected';
}

function formatEnabled(value) {
  return value ? 'enabled' : 'disabled';
}

function formatProtection(value) {
  if (value === null || value === undefined || value === false) {
    return 'disabled';
  }
  return 'enabled';
}

function formatTargets(target) {
  if (Array.isArray(target)) {
    return target.join(', ');
  }
  return target || 'unknown';
}

function sortEnv(envs) {
  return [...envs].sort((left, right) => left.key.localeCompare(right.key));
}

function sortDomains(domains) {
  return [...domains].sort((left, right) => left.name.localeCompare(right.name));
}

function missingCodeEnvRefs(envs, codeEnvRefs) {
  const configuredKeys = new Set(envs.map((env) => env.key));
  return codeEnvRefs.filter((ref) => !configuredKeys.has(ref.key));
}

function formatVercelConfig(config) {
  const lines = [];
  for (const cron of config.crons || []) {
    lines.push(`- Cron: ${cron.path} - ${cron.schedule}`);
  }
  for (const rewrite of config.rewrites || []) {
    lines.push(`- Rewrite: ${rewrite.source} -> ${rewrite.destination}`);
  }
  for (const redirect of config.redirects || []) {
    lines.push(`- Redirect: ${redirect.source} -> ${redirect.destination}`);
  }
  for (const header of config.headers || []) {
    lines.push(`- Header rule: ${header.source}`);
  }
  return lines;
}
