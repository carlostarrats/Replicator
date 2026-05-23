import { normalizeTargets } from './config-snapshot.mjs';

const PROJECT_SPECIFIC_PATTERNS = [
  /^DATABASE_URL$/,
  /^NEXT_PUBLIC_.*BRAND/,
  /^NEXT_PUBLIC_.*URL/,
  /^VERCEL_URL$/,
];

export function recommendEnvRefactors(projectSnapshots) {
  const usage = new Map();

  for (const snapshot of projectSnapshots) {
    for (const env of snapshot.envs) {
      const targets = normalizeTargets(env.target);
      const current = usage.get(env.key) || [];
      current.push({
        project: snapshot.project.name,
        targets,
      });
      usage.set(env.key, current);
    }
  }

  const sharedCandidates = [];
  const projectSpecific = [];
  const scopeDrift = [];

  for (const [key, entries] of [...usage.entries()].sort()) {
    const projectCount = new Set(entries.map((entry) => entry.project)).size;
    const uniqueScopes = new Set(entries.map((entry) => entry.targets.join(',')));
    const isProjectSpecific = PROJECT_SPECIFIC_PATTERNS.some((pattern) => pattern.test(key));

    if (projectCount > 1 && !isProjectSpecific) {
      sharedCandidates.push(`${key} - used by ${projectCount} projects`);
    }

    if (isProjectSpecific) {
      projectSpecific.push(key);
    }

    if (projectCount > 1 && uniqueScopes.size > 1) {
      scopeDrift.push(`${key} differs across projects`);
    }
  }

  return {
    sharedCandidates,
    projectSpecific,
    scopeDrift,
  };
}
