export function validateServerConfig(config: {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}): string[] {
  const errors: string[] = [];

  if (!config.command || typeof config.command !== 'string') {
    errors.push('Server command is required and must be a string');
  }

  if (config.args && !Array.isArray(config.args)) {
    errors.push('Server args must be an array of strings');
  }

  if (config.env && typeof config.env !== 'object') {
    errors.push('Server env must be an object');
  }

  return errors;
}

export function sanitizeServerId(id: string): string {
  // Remove any characters that could be used for path traversal
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}
