import { createTeamOverview } from '../analysis/team-overview.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { renderTeamOverview } from '../output/terminal.mjs';
import { listProjects } from '../vercel/client.mjs';

export async function createOverview(options) {
  const projects = options.projectNames
    ? options.projectNames.map((name) => ({ name }))
    : await listProjects(options);
  const snapshots = await Promise.all(
    projects.map((project) => loadConfigSnapshot(options, project.name)),
  );
  const overview = createTeamOverview(snapshots);

  if (options.format === 'json') {
    return `${JSON.stringify(overview, null, 2)}\n`;
  }

  return renderTeamOverview(overview);
}
