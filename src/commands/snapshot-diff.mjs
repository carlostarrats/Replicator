import { readFile } from 'node:fs/promises';
import { diffSnapshots } from '../analysis/diff.mjs';
import { renderDiff } from '../output/terminal.mjs';

export async function diffSnapshotReports(options) {
  if (!options.leftFile || !options.rightFile) {
    throw new Error('Usage: vcopy snapshot-diff --left <left.json> --right <right.json>');
  }

  const left = JSON.parse(await readFile(options.leftFile, 'utf8'));
  const right = JSON.parse(await readFile(options.rightFile, 'utf8'));
  const result = {
    leftName: left.project?.name || 'left',
    rightName: right.project?.name || 'right',
    diff: diffSnapshots(toSnapshot(left), toSnapshot(right)),
  };

  return {
    hasDrift: hasDrift(result),
    output: renderDiff(result),
  };
}

function toSnapshot(report) {
  return {
    project: report.project || {},
    envs: report.envs || [],
    domains: report.domains || [],
  };
}

function hasDrift(result) {
  return result.diff.different.length > 0
    || result.diff.missingFromLeft.length > 0
    || result.diff.missingFromRight.length > 0;
}
