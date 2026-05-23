#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { getCommand, isKnownCommand } from './cli/command-registry.mjs';
import { EXIT_CODES } from './cli/exit-codes.mjs';
import { loadVcopyConfig } from './config/load-config.mjs';
import { analyzeProject } from './commands/analyze.mjs';
import { saveAuditReport } from './commands/audit-save.mjs';
import { checkProject } from './commands/check.mjs';
import { runCiCheck } from './commands/ci.mjs';
import { diffProjects } from './commands/diff.mjs';
import { moveDomain } from './commands/domain-move.mjs';
import { duplicateProject } from './commands/duplicate.mjs';
import { pushEnv } from './commands/env-push.mjs';
import { removeEnv } from './commands/env-rm.mjs';
import { createEnvTemplate } from './commands/env-template.mjs';
import { createHandoffPackage } from './commands/handoff-package.mjs';
import { createIntegrationPlan } from './commands/integration-plan.mjs';
import { listVercelProjects } from './commands/projects.mjs';
import { syncProtection } from './commands/protection-sync.mjs';
import { refactorEnv } from './commands/refactor-env.mjs';
import { createMigrationReport } from './commands/report.mjs';
import { syncRouting } from './commands/routing-sync.mjs';
import { migrateSecrets } from './commands/secrets-migrate.mjs';
import { diffSnapshotReports } from './commands/snapshot-diff.mjs';
import { saveSnapshot } from './commands/snapshot-save.mjs';
import { listVercelTeams } from './commands/teams.mjs';
import { applyProjectTemplate } from './commands/template-apply.mjs';
import { createProjectTemplate } from './commands/template.mjs';
import { createTemplatePlan } from './commands/template-plan.mjs';
import { verifyProject } from './commands/verify.mjs';
import { createViewer } from './commands/viewer.mjs';
import { createOverview } from './commands/overview.mjs';
import { checkPolicy } from './commands/policy-check.mjs';
import { renderDeploymentVerification, renderDiff, renderEnvPush, renderEnvRemove, renderProjects, renderReadiness, renderTeams } from './output/terminal.mjs';
import { renderDuplicateCreated, renderDuplicatePlan } from './output/terminal.mjs';
import { createLogger } from './output/logger.mjs';
import { withSchema } from './output/schema-version.mjs';
import { listProjects } from './vercel/client.mjs';

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (command === '--version' || command === '-v') {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  if (!isKnownCommand(command)) {
    throw new CliError(`Unknown command: ${command}`, 1);
  }

  const options = await parseArgs(command, rest);
  const logger = createLogger(options);
  logger.debug(`permission: ${getCommand(command).permission}\n`);
  if (command === 'check') {
    const readiness = await checkProject(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(withSchema('check', readiness), null, 2)}\n`
      : renderReadiness(readiness);
    await writeCommandOutput(output, options);
    return options.failOnBlocked && readiness.blocked.length > 0 ? EXIT_CODES.driftOrBlocked : EXIT_CODES.ok;
  }

  if (command === 'diff') {
    const diff = await diffProjects(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(withSchema('diff', diff), null, 2)}\n`
      : renderDiff(diff);
    await writeCommandOutput(output, options);
    return options.failOnDrift && hasDrift(diff) ? EXIT_CODES.driftOrBlocked : EXIT_CODES.ok;
  }

  if (command === 'ci') {
    const result = await runCiCheck(options);
    await writeCommandOutput(result.output, options);
    return result.exitCode;
  }

  if (command === 'duplicate') {
    const result = await duplicateProject(options);
    const output = renderDuplicateResult(result, options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'secrets-migrate') {
    const output = await migrateSecrets(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'domain-move') {
    const output = await moveDomain(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'integration-plan') {
    const output = await createIntegrationPlan(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'protection-sync') {
    const output = await syncProtection(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'routing-sync') {
    const output = await syncRouting(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'report') {
    const output = await createMigrationReport(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'overview') {
    const result = await createOverview(options);
    await writeCommandOutput(result.output, options);
    return options.failOnDrift && result.hasDrift ? EXIT_CODES.driftOrBlocked : EXIT_CODES.ok;
  }

  if (command === 'policy-check') {
    const result = await checkPolicy(options);
    await writeCommandOutput(result.output, options);
    return result.passed ? EXIT_CODES.ok : EXIT_CODES.policyFailed;
  }

  if (command === 'snapshot-diff') {
    const result = await diffSnapshotReports(options);
    await writeCommandOutput(result.output, options);
    return result.hasDrift ? EXIT_CODES.driftOrBlocked : EXIT_CODES.ok;
  }

  if (command === 'snapshot-save') {
    const output = await saveSnapshot(options);
    await writeCommandOutput(output, options);
    return EXIT_CODES.ok;
  }

  if (command === 'audit-save') {
    const output = await saveAuditReport(options);
    await writeCommandOutput(output, options);
    return EXIT_CODES.ok;
  }

  if (command === 'handoff-package') {
    const output = await createHandoffPackage(options);
    await writeCommandOutput(output, options);
    return EXIT_CODES.ok;
  }

  if (command === 'refactor-env') {
    const output = await refactorEnv(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'verify') {
    const verification = await verifyProject(options);
    const output = renderVerifyResult(verification, options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'teams') {
    const teams = await listVercelTeams(options);
    const output = options.format === 'json'
      ? `${JSON.stringify({ teams }, null, 2)}\n`
      : renderTeams(teams);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'projects') {
    const projects = await listVercelProjects(options);
    const output = options.format === 'json'
      ? `${JSON.stringify({ projects }, null, 2)}\n`
      : renderProjects(projects);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'env-template') {
    const output = await createEnvTemplate(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'template') {
    const output = await createProjectTemplate(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'template-apply') {
    const output = await applyProjectTemplate(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'template-plan') {
    const output = await createTemplatePlan(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'viewer') {
    const output = await createViewer(options);
    logger.info(output);
    return 0;
  }

  if (command === 'env-push') {
    const result = await pushEnv(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(result, null, 2)}\n`
      : renderEnvPush(result);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'env-rm') {
    const result = await removeEnv(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(result, null, 2)}\n`
      : renderEnvRemove(result);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (!options.project) {
    options.project = await selectProject(options);
  }
  const report = await analyzeProject(options);
  const outPath = resolve(options.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, options.format === 'json' ? report.json : report.markdown, 'utf8');

  logger.info('Project analyzed successfully.\n');
  logger.info(`Report saved to ${outPath}\n`);
  return 0;
}

function renderDuplicateResult(result, options) {
  if (options.format === 'json') {
    return `${JSON.stringify(result.kind === 'plan' ? result.plan : result, null, 2)}\n`;
  }

  if (result.kind === 'plan') {
    const suffix = result.needsMode
      ? '\nPass --apply to create the project, or --dry-run to make the preview explicit.\n'
      : '';
    return `${renderDuplicatePlan(result.plan)}${suffix}`;
  }

  return renderDuplicateCreated(result);
}

function renderVerifyResult(result, options) {
  if (options.format === 'json') {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  if (result.status === 'none') {
    return 'No deployments found.\n';
  }

  if (result.status === 'ready') {
    return `Latest deployment is ready: ${result.deployment.url}\n`;
  }

  return renderDeploymentVerification(result);
}

function hasDrift(result) {
  return result.diff.different.length > 0
    || result.diff.missingFromLeft.length > 0
    || result.diff.missingFromRight.length > 0;
}

async function writeCommandOutput(output, options) {
  const logger = createLogger(options);
  if (!options.out) {
    logger.info(output);
    return;
  }

  const outPath = resolve(options.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, output, 'utf8');
  logger.info(`Report saved to ${outPath}\n`);
}

async function parseArgs(command, args) {
  const options = {
    project: undefined,
    leftProject: undefined,
    rightProject: undefined,
    fromProject: undefined,
    toProject: undefined,
    projectNames: undefined,
    dryRun: false,
    apply: false,
    yes: false,
    quiet: false,
    verbose: false,
    failOnBlocked: false,
    failOnDrift: false,
    envFile: undefined,
    keys: undefined,
    key: undefined,
    policyFile: undefined,
    reportFile: undefined,
    target: undefined,
    templateFile: undefined,
    domain: undefined,
    fromConfig: undefined,
    leftFile: undefined,
    outDir: undefined,
    toConfig: undefined,
    testProjectOnly: false,
    apiBase: process.env.VCOPY_API_BASE || 'https://api.vercel.com',
    configPath: undefined,
    out: undefined,
    codeRoot: undefined,
    format: 'markdown',
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
    testProjectPrefix: undefined,
    defaultOutDir: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--api-base') {
      options.apiBase = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--config') {
      options.configPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--out') {
      options.out = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--code-root') {
      options.codeRoot = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--format') {
      options.format = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--token') {
      options.token = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--team-id') {
      options.teamId = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--from') {
      options.fromProject = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--projects') {
      options.projectNames = requireValue(args, index, arg)
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--env-file') {
      options.envFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--keys') {
      options.keys = requireValue(args, index, arg)
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--key') {
      options.key = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--policy') {
      options.policyFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--report') {
      options.reportFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--target') {
      options.target = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--template') {
      options.templateFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--domain') {
      options.domain = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--from-config') {
      options.fromConfig = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--left') {
      options.leftFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--out-dir') {
      options.outDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--right') {
      options.rightFile = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--to-config') {
      options.toConfig = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--to') {
      options.toProject = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }

    if (arg === '--verbose') {
      options.verbose = true;
      continue;
    }

    if (arg === '--test-project-only') {
      options.testProjectOnly = true;
      continue;
    }

    if (arg === '--fail-on-blocked') {
      options.failOnBlocked = true;
      continue;
    }

    if (arg === '--fail-on-drift') {
      options.failOnDrift = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new CliError(`Unknown option: ${arg}`, 1);
    }

    if (command === 'diff') {
      if (!options.leftProject) {
        options.leftProject = arg;
        continue;
      }
      if (!options.rightProject) {
        options.rightProject = arg;
        continue;
      }
      throw new CliError('Only two projects can be compared at a time.', 1);
    }

    if (options.project) {
      throw new CliError(`Only one project can be ${command === 'check' ? 'checked' : 'analyzed'} at a time.`, 1);
    }

    options.project = arg;
  }

  const config = await loadVcopyConfig(options.configPath);
  options.teamId = options.teamId || config.teamId;
  options.testProjectPrefix = options.testProjectPrefix || config.testProjectPrefix;
  options.defaultOutDir = options.defaultOutDir || config.defaultOutDir;
  if (command === 'analyze' && !options.out) {
    options.out = join(options.defaultOutDir || '.', 'vcopy-report.md');
  }

  const localOnlyCommands = new Set(['audit-save', 'handoff-package', 'policy-check', 'routing-sync', 'snapshot-diff', 'snapshot-save', 'template-plan', 'viewer']);

  options.token = localOnlyCommands.has(command) ? options.token : await resolveToken(options.token);
  if (!localOnlyCommands.has(command) && !options.token) {
    throw new CliError('Missing Vercel token. Set VERCEL_TOKEN, pass --token, or run `vercel login`.', 1);
  }
  if (!options.teamId) {
    options.teamId = await resolveTeamId(options.codeRoot);
  }

  if (!['markdown', 'json'].includes(options.format)) {
    throw new CliError('Unsupported format. Use markdown or json.', 1);
  }

  if ((command === 'check' || command === 'env-template' || command === 'env-push' || command === 'env-rm' || command === 'template') && !options.project) {
    throw new CliError(`Usage: vcopy ${command} <project>`, 1);
  }

  if (command === 'diff' && (!options.leftProject || !options.rightProject)) {
    throw new CliError('Usage: vcopy diff <project-a> <project-b>', 1);
  }

  if ([
    'duplicate',
    'report',
    'ci',
    'secrets-migrate',
    'domain-move',
    'integration-plan',
    'protection-sync',
  ].includes(command)) {
    if (!options.fromProject || !options.toProject) {
      throw new CliError(`Usage: vcopy ${command} --from <source-project> --to <target-project>`, 1);
    }
    if (command === 'duplicate' && options.dryRun && options.apply) {
      throw new CliError('Choose either --dry-run or --apply, not both.', 1);
    }
  }

  if (command === 'verify' && !options.project) {
    throw new CliError('Usage: vcopy verify <project>', 1);
  }

  if ((command === 'template-plan' || command === 'template-apply') && (!options.templateFile || !options.toProject)) {
    throw new CliError(`Usage: vcopy ${command} --template <template.json> --to <target-project>`, 1);
  }

  if (command === 'policy-check' && (!options.reportFile || !options.policyFile)) {
    throw new CliError('Usage: vcopy policy-check --report <analysis.json> --policy <policy.json>', 1);
  }

  if (command === 'snapshot-diff' && (!options.leftFile || !options.rightFile)) {
    throw new CliError('Usage: vcopy snapshot-diff --left <left.json> --right <right.json>', 1);
  }

  if (command === 'snapshot-save' && (!options.reportFile || !options.outDir)) {
    throw new CliError('Usage: vcopy snapshot-save --report <report.json> --out-dir <directory>', 1);
  }

  if (command === 'audit-save' && (!options.reportFile || !options.outDir)) {
    throw new CliError('Usage: vcopy audit-save --report <report.json> --out-dir <directory>', 1);
  }

  if (command === 'handoff-package' && (!options.reportFile || !options.outDir)) {
    throw new CliError('Usage: vcopy handoff-package --report <report.json> --out-dir <directory>', 1);
  }

  return options;
}

async function resolveTeamId(codeRoot) {
  if (!codeRoot) {
    return undefined;
  }
  try {
    const metadata = JSON.parse(await readFile(join(codeRoot, '.vercel', 'project.json'), 'utf8'));
    return metadata.orgId;
  } catch {
    return undefined;
  }
}

async function resolveToken(explicitToken) {
  if (explicitToken) {
    return explicitToken;
  }

  const authFile = await findVercelAuthFile();
  if (!authFile) {
    return undefined;
  }

  try {
    const auth = JSON.parse(await readFile(authFile, 'utf8'));
    return auth.token;
  } catch {
    return undefined;
  }
}

async function findVercelAuthFile() {
  if (process.env.VERCEL_AUTH_FILE === '') {
    return undefined;
  }

  const candidates = process.env.VERCEL_AUTH_FILE
    ? [process.env.VERCEL_AUTH_FILE]
    : [
        join(process.env.HOME || '', 'Library', 'Application Support', 'com.vercel.cli', 'auth.json'),
        join(process.env.HOME || '', '.vercel', 'auth.json'),
      ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf8');
      return candidate;
    } catch {
      // Try the next known Vercel CLI auth location.
    }
  }
  return undefined;
}

async function selectProject(options) {
  const projects = await listProjects({
    apiBase: options.apiBase,
    token: options.token,
    teamId: options.teamId,
  });

  if (projects.length === 0) {
    throw new CliError('No Vercel projects were found for this account.', 1);
  }

  process.stdout.write('Select a source project:\n');
  projects.forEach((project, index) => {
    const framework = project.framework ? ` (${project.framework})` : '';
    process.stdout.write(`${index + 1}. ${project.name}${framework}\n`);
  });
  process.stdout.write('Enter number: ');

  const input = (await readStdin()).trim();
  const selectedIndex = Number.parseInt(input, 10) - 1;
  const selectedProject = projects[selectedIndex];

  if (!selectedProject) {
    throw new CliError(`Invalid project selection: ${input || 'empty'}`, 1);
  }

  return selectedProject.name;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      resolve(input);
    });
    process.stdin.on('error', reject);
  });
}

function requireValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new CliError(`Missing required value for ${optionName}.`, 1);
  }
  return value;
}

function printHelp() {
  process.stdout.write(`Replicator

A Vercel config manager for safe project analysis, drift checks, and migration handoff workflows.

Usage:
  vcopy analyze [project] [--out ./vcopy-report.md]
  vcopy audit-save --report <report.json> --out-dir <directory>
  vcopy duplicate --from <source-project> --to <new-project> [--dry-run|--apply]
  vcopy check <project>
  vcopy ci --from <source-project> --to <target-project>
  vcopy diff <project-a> <project-b>
  vcopy domain-move --from <source-project> --to <target-project> --domain <domain>
  vcopy refactor-env
  vcopy integration-plan --from <source-project> --to <target-project>
  vcopy protection-sync --from <source-project> --to <target-project>
  vcopy routing-sync --from-config <source-vercel.json> --to-config <target-vercel.json>
  vcopy secrets-migrate --from <source-project> --to <target-project>
  vcopy snapshot-diff --left <left.json> --right <right.json>
  vcopy snapshot-save --report <report.json> --out-dir <directory>
  vcopy verify <project>
  vcopy teams
  vcopy projects
  vcopy env-template <project>
  vcopy env-push <project>
  vcopy env-rm <project>
  vcopy handoff-package --report <report.json> --out-dir <directory>
  vcopy report --from <source-project> --to <target-project>
  vcopy overview
  vcopy policy-check --report <analysis.json> --policy <policy.json>
  vcopy template <project>
  vcopy template-apply --template <template.json> --to <target-project>
  vcopy template-plan --template <template.json> --to <target-project>
  vcopy viewer [--out ./vcopy-viewer.html]

Options:
  --api-base <url>   Override the Vercel API base URL.
  --code-root <dir>  Scan source code for process.env references.
  --format <type>    Output format: markdown or json.
  --fail-on-blocked  Exit 2 from check when readiness has blockers.
  --fail-on-drift    Exit 2 from diff when drift is detected.
  --out <path>       Markdown report destination.
  --projects <list>  Comma-separated project names for refactor-env.
  --quiet            Suppress informational stdout.
  --verbose          Print diagnostic details to stderr.
  --env-file <path>  Local .env file for env-push.
  --keys <list>      Comma-separated env keys for env-push.
  --key <key>        Env key for env-rm.
  --policy <path>    Local policy JSON for policy-check.
  --report <path>    Local report JSON for policy-check.
  --target <target>  Vercel env target for env-push.
  --template <path>  Template JSON file for template-plan.
  --domain <domain>  Domain for domain-move.
  --from-config <p>  Source vercel.json for routing-sync.
  --left <path>      Left report JSON for snapshot-diff.
  --out-dir <path>   Local output directory for snapshot-save.
  --right <path>     Right report JSON for snapshot-diff.
  --to-config <p>    Target vercel.json for routing-sync.
  --test-project-only
                    Required for protected test writes.
  --team-id <id>     Vercel team ID for scoped projects.
  --token <token>    Vercel bearer token. Prefer VERCEL_TOKEN.
`);
}

class CliError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

main(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error.exitCode || EXIT_CODES.error;
});
