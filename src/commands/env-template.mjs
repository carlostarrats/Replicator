import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';

export async function createEnvTemplate(options) {
  const snapshot = await loadConfigSnapshot(options, options.project);
  const keys = [...new Set(snapshot.envs.map((env) => env.key))].sort();
  return `${keys.map((key) => `${key}=`).join('\n')}\n`;
}
