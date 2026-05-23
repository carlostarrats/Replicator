import { createDuplicatePlan } from '../analysis/duplicate-plan.mjs';
import { diffSnapshots } from '../analysis/diff.mjs';
import { calculateReadiness } from '../analysis/readiness.mjs';
import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { renderDiff, renderDuplicatePlan, renderReadiness } from '../output/terminal.mjs';

export async function createMigrationReport(options) {
  const [source, target] = await Promise.all([
    loadConfigSnapshot(options, options.fromProject),
    loadConfigSnapshot(options, options.toProject),
  ]);
  const duplicatePlan = createDuplicatePlan(source, options.toProject);
  const readiness = calculateReadiness(target);
  const diff = diffSnapshots(source, target);

  return [
    '# Vercel Migration Report',
    '',
    `Source: ${source.project.name || options.fromProject}`,
    `Target: ${target.project.name || options.toProject}`,
    '',
    '## Duplicate Plan',
    '',
    renderDuplicatePlan(duplicatePlan).trim(),
    '',
    '## Target Readiness',
    '',
    renderReadiness(readiness).trim(),
    '',
    '## Project Diff',
    '',
    renderDiff({
      leftName: source.project.name || options.fromProject,
      rightName: target.project.name || options.toProject,
      diff,
    }).trim(),
    '',
  ].join('\n');
}
