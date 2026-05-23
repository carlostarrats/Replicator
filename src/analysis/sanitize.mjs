export function sanitizeProject(project) {
  return {
    id: project.id,
    name: project.name,
    framework: project.framework,
    rootDirectory: project.rootDirectory,
    installCommand: project.installCommand,
    devCommand: project.devCommand,
    buildCommand: project.buildCommand,
    outputDirectory: project.outputDirectory,
    nodeVersion: project.nodeVersion,
    serverlessFunctionRegion: project.serverlessFunctionRegion,
    gitForkProtection: project.gitForkProtection,
    ssoProtection: project.ssoProtection,
    autoExposeSystemEnvs: project.autoExposeSystemEnvs,
    webAnalytics: project.webAnalytics ? true : false,
    gitRepository: project.gitRepository,
  };
}

export function sanitizeEnv(env) {
  return {
    key: env.key,
    target: env.target,
    type: env.type,
    configurationId: env.configurationId,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
    decrypted: env.decrypted,
  };
}

export function sanitizeDomain(domain) {
  return {
    name: domain.name,
    verified: domain.verified,
  };
}
