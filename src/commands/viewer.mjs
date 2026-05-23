import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function createViewer(options) {
  const out = resolve(options.out || './vcopy-viewer.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, renderViewerHtml(), 'utf8');
  return `Viewer saved to ${out}\n`;
}

export function renderViewerHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Replicator Viewer</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17201b;
      --muted: #617068;
      --paper: #f7f4ec;
      --panel: #fffdf7;
      --line: #d8d0bf;
      --accent: #0f766e;
      --warn: #b45309;
      --bad: #b91c1c;
      --good: #166534;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--paper);
      color: var(--ink);
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
    }
    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }
    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 28px;
      align-items: end;
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
    }
    h1 {
      margin: 0;
      max-width: 820px;
      font-size: clamp(40px, 6vw, 84px);
      line-height: 0.92;
      letter-spacing: 0;
      font-weight: 700;
    }
    .deck {
      margin: 18px 0 0;
      color: var(--muted);
      max-width: 720px;
      font-size: 18px;
      line-height: 1.45;
    }
    .loader {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    label {
      display: block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    input[type="file"] {
      width: 100%;
      border: 1px dashed var(--line);
      background: #fbfaf5;
      padding: 14px;
      border-radius: 6px;
      color: var(--ink);
    }
    textarea {
      width: 100%;
      min-height: 120px;
      margin-top: 12px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
      background: #fbfaf5;
      color: var(--ink);
      font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    button {
      margin-top: 12px;
      width: 100%;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: white;
      padding: 12px 14px;
      font: 700 13px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      cursor: pointer;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      margin-top: 24px;
    }
    .panel {
      grid-column: span 6;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      min-height: 150px;
    }
    .wide { grid-column: 1 / -1; }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .metric {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 10px;
      font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #fbfaf5;
    }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 6px 0; }
    pre {
      overflow: auto;
      margin: 0;
      padding: 14px;
      border-radius: 6px;
      background: #17201b;
      color: #f7f4ec;
      font-size: 12px;
      line-height: 1.5;
    }
    .empty {
      color: var(--muted);
      font-style: italic;
    }
    .status-failed { color: var(--bad); }
    .status-passed, .status-ready { color: var(--good); }
    .status-warning { color: var(--warn); }
    @media (max-width: 860px) {
      header, .grid { display: block; }
      .loader, .panel { margin-top: 16px; }
      main { width: min(100vw - 24px, 720px); padding-top: 20px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <section>
        <h1>Replicator</h1>
        <p class="deck">Load JSON report exports from analyze, check, diff, ci, overview, template, or template-plan. This viewer is local-only and never calls Vercel.</p>
      </section>
      <section class="loader" aria-label="Load JSON report">
        <label for="file">Load JSON report</label>
        <input id="file" type="file" accept="application/json,.json">
        <textarea id="paste" placeholder="Or paste report JSON here"></textarea>
        <button id="render">Render Report</button>
      </section>
    </header>
    <section id="output" class="grid" aria-live="polite">
      <article class="panel wide">
        <h2>No report loaded</h2>
        <p class="empty">Export a JSON report with the CLI, then load it here.</p>
      </article>
    </section>
  </main>
  <script>
    const fileInput = document.querySelector('#file');
    const paste = document.querySelector('#paste');
    const renderButton = document.querySelector('#render');
    const output = document.querySelector('#output');

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      paste.value = await file.text();
      renderReport();
    });
    renderButton.addEventListener('click', renderReport);

    function renderReport() {
      try {
        const data = JSON.parse(paste.value);
        output.innerHTML = render(data);
      } catch (error) {
        output.innerHTML = panel('Could not parse JSON', '<p class="status-failed">' + escapeHtml(error.message) + '</p>', true);
      }
    }

    function render(data) {
      if (data.reportType === 'ci') return renderCi(data);
      if (data.reportType === 'analysis') return renderAnalysis(data);
      if (data.reportType === 'check') return renderReadiness(data);
      if (data.reportType === 'diff') return renderDiff(data);
      if (data.reportType === 'overview') return renderOverview(data);
      if (data.reportType === 'template') return renderTemplate(data);
      if (data.reportType === 'template-plan') return renderTemplatePlan(data);
      if (data.status && data.readiness && data.diff) return renderCi(data);
      if (data.project && data.envs) return renderAnalysis(data);
      if (data.score !== undefined && data.ready) return renderReadiness(data);
      if (data.diff && data.leftName) return renderDiff(data);
      if (data.groups && data.recommendations) return renderOverview(data);
      if (data.kind === 'vercel-project-template') return renderTemplate(data);
      if (data.targetProject && data.settings) return renderTemplatePlan(data);
      return panel('Raw JSON', '<pre>' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre>', true);
    }

    function renderCi(data) {
      return [
        panel('CI status', '<div class="metric"><span class="pill status-' + data.status + '">' + escapeHtml(data.status) + '</span><span class="pill">Readiness ' + data.readiness.score + '%</span></div>'),
        panel('Blocked', list(data.readiness.blocked)),
        panel('Drift', list([...(data.diff.diff.different || []), ...(data.diff.diff.missingFromLeft || []), ...(data.diff.diff.missingFromRight || [])]), true)
      ].join('');
    }

    function renderAnalysis(data) {
      return [
        panel('Project', metrics(data.project)),
        panel('Environment variables', list((data.envs || []).map(env => env.key + ' - ' + [].concat(env.target || []).join(', ')))),
        panel('Likely services', list(data.likelyServices || [])),
        panel('Domains', list((data.domains || []).map(domain => domain.name + (domain.verified ? ' - verified' : ' - not verified'))))
      ].join('');
    }

    function renderReadiness(data) {
      return [
        panel('Readiness', '<div class="metric"><span class="pill">' + data.score + '%</span></div>'),
        panel('Ready', list(data.ready)),
        panel('Needs attention', list(data.needsAttention)),
        panel('Blocked', list(data.blocked))
      ].join('');
    }

    function renderDiff(data) {
      return [
        panel('Comparison', '<div class="metric"><span class="pill">' + escapeHtml(data.leftName) + '</span><span class="pill">' + escapeHtml(data.rightName) + '</span></div>', true),
        panel('Same', list(data.diff.same)),
        panel('Different', list(data.diff.different)),
        panel('Missing', list([...(data.diff.missingFromLeft || []), ...(data.diff.missingFromRight || [])]))
      ].join('');
    }

    function renderOverview(data) {
      return [
        panel('Overview', '<div class="metric"><span class="pill">' + data.projectCount + ' projects</span></div>'),
        panel('Groups', list((data.groups || []).map(group => group.name + ': ' + group.projects.join(', ')))),
        panel('Drift signals', list((data.groups || []).flatMap(group => group.drift))),
        panel('Shared candidates', list(data.recommendations.sharedCandidates || []))
      ].join('');
    }

    function renderTemplate(data) {
      return [
        panel('Template', metrics({ sourceProject: data.sourceProject, version: data.version })),
        panel('Project settings', metrics(data.project || {})),
        panel('Environment placeholders', list((data.env || []).map(env => env.key + ' - ' + env.target.join(', ')))),
        panel('Manual review', list(data.manualReview || []))
      ].join('');
    }

    function renderTemplatePlan(data) {
      return [
        panel('Template plan', metrics({ targetProject: data.targetProject, sourceProject: data.sourceProject })),
        panel('Settings', metrics(data.settings || {})),
        panel('Environment placeholders', list((data.env || []).map(env => env.key + ' - ' + env.target.join(', ')))),
        panel('Manual review', list(data.manualReview || []))
      ].join('');
    }

    function panel(title, body, wide = false) {
      return '<article class="panel' + (wide ? ' wide' : '') + '"><h2>' + escapeHtml(title) + '</h2>' + body + '</article>';
    }

    function list(items) {
      const clean = (items || []).filter(Boolean);
      if (!clean.length) return '<p class="empty">None</p>';
      return '<ul>' + clean.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
    }

    function metrics(object) {
      const entries = Object.entries(object || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
      if (!entries.length) return '<p class="empty">None</p>';
      return '<div class="metric">' + entries.map(([key, value]) => '<span class="pill">' + escapeHtml(key) + ': ' + escapeHtml(String(value)) + '</span>').join('') + '</div>';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
  </script>
</body>
</html>
`;
}
