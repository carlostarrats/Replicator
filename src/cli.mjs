#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { analyzeProject } from './commands/analyze.mjs';
import { checkProject } from './commands/check.mjs';
import { runCiCheck } from './commands/ci.mjs';
import { diffProjects } from './commands/diff.mjs';
import { duplicateProject } from './commands/duplicate.mjs';
import { pushEnv } from './commands/env-push.mjs';
import { removeEnv } from './commands/env-rm.mjs';
import { createEnvTemplate } from './commands/env-template.mjs';
import { listVercelProjects } from './commands/projects.mjs';
import { refactorEnv } from './commands/refactor-env.mjs';
import { createMigrationReport } from './commands/report.mjs';
import { listVercelTeams } from './commands/teams.mjs';
import { createProjectTemplate } from './commands/template.mjs';
import { createTemplatePlan } from './commands/template-plan.mjs';
import { verifyProject } from './commands/verify.mjs';
import { createOverview } from './commands/overview.mjs';
import { renderDeploymentVerification, renderDiff, renderEnvPush, renderEnvRemove, renderProjects, renderReadiness, renderTeams } from './output/terminal.mjs';
import { renderDuplicateCreated, renderDuplicatePlan } from './output/terminal.mjs';
import { listProjects } from './vercel/client.mjs';

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (!['analyze', 'check', 'ci', 'diff', 'duplicate', 'refactor-env', 'verify', 'teams', 'projects', 'env-template', 'env-push', 'env-rm', 'report', 'overview', 'template', 'template-plan'].includes(command)) {
    throw new CliError(`Unknown command: ${command}`, 1);
  }

  const options = await parseArgs(command, rest);
  if (command === 'check') {
    const readiness = await checkProject(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(readiness, null, 2)}\n`
      : renderReadiness(readiness);
    await writeCommandOutput(output, options);
    return options.failOnBlocked && readiness.blocked.length > 0 ? 2 : 0;
  }

  if (command === 'diff') {
    const diff = await diffProjects(options);
    const output = options.format === 'json'
      ? `${JSON.stringify(diff, null, 2)}\n`
      : renderDiff(diff);
    await writeCommandOutput(output, options);
    return options.failOnDrift && hasDrift(diff) ? 2 : 0;
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

  if (command === 'report') {
    const output = await createMigrationReport(options);
    await writeCommandOutput(output, options);
    return 0;
  }

  if (command === 'overview') {
    const result = await createOverview(options);
    await writeCommandOutput(result.output, options);
    return options.failOnDrift && result.hasDrift ? 2 : 0;
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

  if (command === 'template-plan') {
    const output = await createTemplatePlan(options);
    await writeCommandOutput(output, options);
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

  process.stdout.write('Project analyzed successfully.\n');
  process.stdout.write(`Report saved to ${outPath}\n`);
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
  if (!options.out) {
    process.stdout.write(output);
    return;
  }

  const outPath = resolve(options.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, output, 'utf8');
  process.stdout.write(`Report saved to ${outPath}\n`);
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
    failOnBlocked: false,
    failOnDrift: false,
    envFile: undefined,
    keys: undefined,
    key: undefined,
    target: undefined,
    templateFile: undefined,
    apiBase: process.env.VCOPY_API_BASE || 'https://api.vercel.com',
    out: command === 'analyze' ? './vcopy-report.md' : undefined,
    codeRoot: undefined,
    format: 'markdown',
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--api-base') {
      options.apiBase = requireValue(args, index, arg);
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

  const localOnlyCommands = new Set(['template-plan']);

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

  if (command === 'duplicate' || command === 'report' || command === 'ci') {
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

  if (command === 'template-plan' && (!options.templateFile || !options.toProject)) {
    throw new CliError('Usage: vcopy template-plan --template <template.json> --to <target-project>', 1);
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
  process.stdout.write(`Vercel Config Manager

Usage:
  vcopy analyze [project] [--out ./vcopy-report.md]
  vcopy duplicate --from <source-project> --to <new-project> [--dry-run|--apply]
  vcopy check <project>
  vcopy ci --from <source-project> --to <target-project>
  vcopy diff <project-a> <project-b>
  vcopy refactor-env
  vcopy verify <project>
  vcopy teams
  vcopy projects
  vcopy env-template <project>
  vcopy env-push <project>
  vcopy env-rm <project>
  vcopy report --from <source-project> --to <target-project>
  vcopy overview
  vcopy template <project>
  vcopy template-plan --template <template.json> --to <target-project>

Options:
  --api-base <url>   Override the Vercel API base URL.
  --code-root <dir>  Scan source code for process.env references.
  --format <type>    Output format: markdown or json.
  --fail-on-blocked  Exit 2 from check when readiness has blockers.
  --fail-on-drift    Exit 2 from diff when drift is detected.
  --out <path>       Markdown report destination.
  --projects <list>  Comma-separated project names for refactor-env.
  --env-file <path>  Local .env file for env-push.
  --keys <list>      Comma-separated env keys for env-push.
  --key <key>        Env key for env-rm.
  --target <target>  Vercel env target for env-push.
  --template <path>  Template JSON file for template-plan.
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
  process.exitCode = error.exitCode || 1;
});
