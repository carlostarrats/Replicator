export const EXIT_CODES = {
  ok: 0,
  error: 1,
  driftOrBlocked: 2,
  unsafeWriteRefused: 3,
  policyFailed: 4,
};

export class UnsafeWriteError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = EXIT_CODES.unsafeWriteRefused;
  }
}
