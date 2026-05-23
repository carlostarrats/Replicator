import { loadConfigSnapshot } from '../analysis/config-snapshot.mjs';
import { diffSnapshots } from '../analysis/diff.mjs';

export async function diffProjects(options) {
  const [left, right] = await Promise.all([
    loadConfigSnapshot(options, options.leftProject),
    loadConfigSnapshot(options, options.rightProject),
  ]);

  const diff = diffSnapshots(left, right);
  return {
    leftName: left.project.name || options.leftProject,
    rightName: right.project.name || options.rightProject,
    diff,
  };
}
