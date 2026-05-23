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
  const output = options.format === 'json'
    ? `${JSON.stringify(overview, null, 2)}\n`
    : renderTeamOverview(overview);

  return {
    output,
    hasDrift: overview.groups.some((group) => group.drift.length > 0),
  };
}
