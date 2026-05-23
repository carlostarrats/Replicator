import { envScopeMap } from './config-snapshot.mjs';

const REQUIRED_BUILD_FIELDS = ['framework', 'buildCommand', 'installCommand', 'outputDirectory', 'rootDirectory'];

export function calculateReadiness(snapshot, codeEnvRefs = []) {
  const ready = [];
  const needsAttention = [];
  const blocked = [];

  const configuredBuildFields = REQUIRED_BUILD_FIELDS.filter((field) => Boolean(snapshot.project[field]));
  if (configuredBuildFields.length === REQUIRED_BUILD_FIELDS.length) {
    ready.push('Build settings configured');
  } else {
    needsAttention.push('Some build settings are not configured');
  }

  if (snapshot.project.gitRepository) {
    ready.push('Git repository connected');
  } else {
    needsAttention.push('Git repository not connected');
  }

  const scopesByKey = envScopeMap(snapshot.envs);
  const configuredKeys = new Set(snapshot.envs.map((env) => env.key));
  if (scopesByKey.size > 0) {
    ready.push('Environment variable names indexed');
  } else {
    needsAttention.push('No environment variables detected');
  }

  for (const [key, scopes] of scopesByKey) {
    if (scopes.includes('production') && !scopes.includes('preview')) {
      blocked.push(`${key} missing for Preview`);
    }
  }

  for (const ref of codeEnvRefs) {
    if (!configuredKeys.has(ref.key)) {
      needsAttention.push(`${ref.key} referenced in code but missing in Vercel`);
    }
  }

  const score = Math.max(0, Math.min(100, 100 - (needsAttention.length * 10) - (blocked.length * 20)));

  return {
    score,
    ready,
    needsAttention,
    blocked,
  };
}
