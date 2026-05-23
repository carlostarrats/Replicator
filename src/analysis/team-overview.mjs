import { normalizeTargets } from './config-snapshot.mjs';
import { recommendEnvRefactors } from './refactor-env.mjs';

export function createTeamOverview(snapshots) {
  const groups = new Map();

  for (const snapshot of snapshots) {
    const key = groupKey(snapshot.project);
    const current = groups.get(key) || {
      name: key,
      projects: [],
      drift: [],
    };
    current.projects.push(snapshot.project.name);
    current.snapshots = [...(current.snapshots || []), snapshot];
    groups.set(key, current);
  }

  const variantGroups = [...groups.values()]
    .map((group) => ({
      name: group.name,
      projects: group.projects.sort(),
      drift: findGroupDrift(group.snapshots),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    projectCount: snapshots.length,
    groups: variantGroups,
    recommendations: recommendEnvRefactors(snapshots),
  };
}

function groupKey(project) {
  const repo = project.gitRepository?.repo || 'unlinked repo';
  const root = project.rootDirectory || '.';
  return `${repo} :: ${root}`;
}

function findGroupDrift(snapshots) {
  if (snapshots.length < 2) {
    return [];
  }

  const drift = [];
  const envByProject = new Map();
  const allKeys = new Set();

  for (const snapshot of snapshots) {
    const envMap = new Map();
    for (const env of snapshot.envs) {
      envMap.set(env.key, normalizeTargets(env.target));
      allKeys.add(env.key);
    }
    envByProject.set(snapshot.project.name, envMap);
  }

  for (const key of [...allKeys].sort()) {
    const present = [];
    const missing = [];
    const scopes = new Set();

    for (const snapshot of snapshots) {
      const projectEnv = envByProject.get(snapshot.project.name);
      if (!projectEnv.has(key)) {
        missing.push(snapshot.project.name);
        continue;
      }
      const targets = projectEnv.get(key);
      present.push(snapshot.project.name);
      scopes.add(targets.join(','));
    }

    if (missing.length > 0 && present.length > 0) {
      drift.push(`${key} missing from ${missing.sort().join(', ')}`);
    } else if (scopes.size > 1) {
      drift.push(`${key} differs across projects`);
    }
  }

  return drift;
}
