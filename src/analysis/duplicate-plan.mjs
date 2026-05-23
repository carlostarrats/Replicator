export function createDuplicatePlan(snapshot, targetProjectName) {
  const envKeys = [...new Set(snapshot.envs.map((env) => env.key))].sort();
  const domains = snapshot.domains || [];
  const manualReview = [];

  if (domains.length > 0) {
    manualReview.push(`${domains.length} domain(s) detected but not copied`);
  }
  if (snapshot.vercelConfig?.crons?.length > 0) {
    manualReview.push(`${snapshot.vercelConfig.crons.length} cron job(s) detected in vercel.json`);
  }
  if (snapshot.vercelConfig?.rewrites?.length > 0) {
    manualReview.push(`${snapshot.vercelConfig.rewrites.length} rewrite(s) detected in vercel.json`);
  }
  if (snapshot.vercelConfig?.redirects?.length > 0) {
    manualReview.push(`${snapshot.vercelConfig.redirects.length} redirect(s) detected in vercel.json`);
  }

  return {
    sourceProjectName: snapshot.project.name,
    targetProjectName,
    copiedSettings: {
      framework: snapshot.project.framework,
      rootDirectory: snapshot.project.rootDirectory,
      installCommand: snapshot.project.installCommand,
      devCommand: snapshot.project.devCommand,
      buildCommand: snapshot.project.buildCommand,
      outputDirectory: snapshot.project.outputDirectory,
    },
    envKeys,
    manualReview,
    skipped: [
      'Copy secret values',
      'Move domains',
      'Copy integration credentials',
      'Modify the source project',
      'Delete anything',
    ],
  };
}
