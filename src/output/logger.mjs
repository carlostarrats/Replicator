export function createLogger(options) {
  return {
    info(message) {
      if (!options.quiet) {
        process.stdout.write(message);
      }
    },
    debug(message) {
      if (options.verbose) {
        process.stderr.write(message);
      }
    },
  };
}
