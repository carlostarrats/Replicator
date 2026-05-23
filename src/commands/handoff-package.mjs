import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { renderViewerHtml } from './viewer.mjs';

export async function createHandoffPackage(options) {
  if (!options.reportFile || !options.outDir) {
    throw new Error('Usage: vcopy handoff-package --report <report.json> --out-dir <directory>');
  }

  const reportPath = resolve(options.reportFile);
  const outDir = resolve(options.outDir);
  const reportText = await readFile(reportPath, 'utf8');
  const report = JSON.parse(reportText);
  const reportName = basename(reportPath);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, reportName), reportText, 'utf8');
  await writeFile(join(outDir, 'README.md'), renderReadme(report, reportName), 'utf8');
  await writeFile(join(outDir, 'CHECKLIST.md'), renderChecklist(report), 'utf8');
  await writeFile(join(outDir, 'vcopy-viewer.html'), renderViewerHtml(), 'utf8');

  return `Handoff package saved to ${outDir}\n`;
}

function renderReadme(report, reportName) {
  return [
    '# Vercel Config Handoff',
    '',
    `Project: ${report.project?.name || report.targetProject || report.reportType || 'unknown'}`,
    `Report: ${reportName}`,
    '',
    'Open `vcopy-viewer.html` locally and load the JSON report for review.',
    '',
  ].join('\n');
}

function renderChecklist(report) {
  return [
    '# Handoff Checklist',
    '',
    '- Review build settings and framework configuration.',
    '- Add secret values manually in Vercel.',
    '- Review domains and integrations manually before any production change.',
    `- Source report type: ${report.reportType || 'unknown'}.`,
    '',
  ].join('\n');
}
