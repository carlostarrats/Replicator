import { UnsafeWriteError } from '../cli/exit-codes.mjs';

export function assertTestProjectWrite(options, projectNames) {
  if (!options.apply || !options.yes || !options.testProjectOnly) {
    throw new UnsafeWriteError('Refusing write without --test-project-only --apply --yes.');
  }

  for (const projectName of projectNames.filter(Boolean)) {
    if (!projectName.startsWith('vcopy-test-')) {
      throw new UnsafeWriteError(`Destructive writes allow only vcopy-test- project names. Refusing ${projectName}.`);
    }
  }
}

export function assertDryRunOrTestWrite(options, projectNames) {
  if (options.dryRun) {
    return;
  }
  assertTestProjectWrite(options, projectNames);
}
