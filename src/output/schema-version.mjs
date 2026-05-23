export const SCHEMA_VERSION = 1;

export function withSchema(reportType, payload) {
  return {
    schemaVersion: SCHEMA_VERSION,
    reportType,
    ...payload,
  };
}
