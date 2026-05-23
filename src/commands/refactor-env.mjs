import { recommendEnvRefactors } from '../analysis/refactor-env.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { renderEnvRefactorRecommendations } from '../output/terminal.mjs';
import { listProjects } from '../vercel/client.mjs';

export async function refactorEnv(options) {
  const projects = options.projectNames
    ? options.projectNames.map((name) => ({ name }))
    : await listProjects(options);
  const snapshots = await Promise.all(
    projects.map((project) => loadConfigSnapshot(options, project.name)),
  );

  return renderEnvRefactorRecommendations(recommendEnvRefactors(snapshots));
}
