import { getProject, listProjectDomains, listProjectEnv } from '../vercel/client.mjs';

export async function loadConfigSnapshot(options, projectName) {
  const project = await getProject({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
    idOrName: projectName,
  });

  const [envs, domains] = await Promise.all([
    listProjectEnv({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: projectName,
    }),
    listProjectDomains({
      apiBase: options.apiBase,
      token: options.token,
      teamId: options.teamId,
      idOrName: projectName,
    }).catch(() => []),
  ]);

  return {
    project,
    envs,
    domains,
  };
}

export function envScopeMap(envs) {
  const map = new Map();
  for (const env of envs) {
    map.set(env.key, normalizeTargets(env.target));
  }
  return map;
}

export function normalizeTargets(target) {
  if (Array.isArray(target)) {
    return [...new Set(target.map(normalizeTargetName))].sort();
  }
  if (!target) {
    return [];
  }
  return [normalizeTargetName(target)];
}

function normalizeTargetName(target) {
  return String(target).toLowerCase();
}
