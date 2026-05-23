const ENV_MISSING_PATTERNS = [
  /Environment variable not found:\s*([A-Z0-9_]+)/i,
  /Missing required environment variable:?\s*([A-Z0-9_]+)/i,
  /process\.env\.([A-Z0-9_]+)/i,
];

export function classifyDeploymentFailure(deployment, events) {
  const text = events.map(eventText).join('\n');
  const envKey = findEnvKey(text);

  if (envKey) {
    return {
      title: 'Detected issue:',
      summary: `${envKey} is missing or invalid in ${formatTarget(deployment.target)}`,
      fix: `vercel env add ${envKey} ${deployment.target || 'preview'}`,
    };
  }

  return {
    title: 'Detected issue:',
    summary: 'Deployment failed, but no known configuration pattern was detected.',
    fix: 'Review the deployment logs in Vercel.',
  };
}

function findEnvKey(text) {
  for (const pattern of ENV_MISSING_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function eventText(event) {
  if (typeof event === 'string') {
    return event;
  }
  return event?.payload?.text || event?.text || event?.message || '';
}

function formatTarget(target) {
  if (!target) {
    return 'Preview';
  }
  return `${target.charAt(0).toUpperCase()}${target.slice(1)}`;
}
