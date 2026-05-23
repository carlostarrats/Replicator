import { UnsafeWriteError } from '../cli/exit-codes.mjs';

export function assertTestProjectWrite(options, projectNames) {
  if (!options.apply || !options.yes || !options.testProjectOnly) {
    throw new UnsafeWriteError('Refusing write without --test-project-only --apply --yes.');
  }

  const prefix = options.testProjectPrefix || 'vcopy-test-';
  for (const projectName of projectNames.filter(Boolean)) {
    if (!projectName.startsWith(prefix)) {
      throw new UnsafeWriteError(`Destructive writes allow only ${prefix} project names. Refusing ${projectName}.`);
    }
  }
}

export function assertDryRunOrTestWrite(options, projectNames) {
  if (options.dryRun) {
    return;
  }
  assertTestProjectWrite(options, projectNames);
}
