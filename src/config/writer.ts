import * as fs from 'fs';
import * as path from 'path';
import { ClientConfig } from '../types/server';
import { readConfig } from './reader';

export function writeConfig(configPath: string, config: ClientConfig, format: string): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Read existing config to preserve other settings
  const existing = readConfig(configPath, format);
  const merged: ClientConfig = {
    mcpServers: { ...existing.mcpServers, ...config.mcpServers }
  };

  // Atomic write: write to temp, then rename
  const tempPath = `${configPath}.tmp`;

  let output: Record<string, unknown>;

  switch (format) {
    case 'claude':
    case 'cursor':
    case 'vscode':
    case 'mcphub':
      output = { mcpServers: merged.mcpServers };
      break;
    case 'continue': {
      // Continue.dev uses mcpServers key inside config.json
      output = { mcpServers: merged.mcpServers };
      break;
    }
    case 'zed': {
      // Zed uses mcp_servers key
      const zedServers: Record<string, { command: string; args?: string[] }> = {};
      for (const [key, value] of Object.entries(merged.mcpServers)) {
        const v = value as { command: string; args?: string[] };
        zedServers[key] = {
          command: v.command,
          args: v.args
        };
      }
      output = { mcp_servers: zedServers };
      break;
    }
    default:
      output = { mcpServers: merged.mcpServers };
  }

  const jsonContent = JSON.stringify(output, null, 2);

  fs.writeFileSync(tempPath, jsonContent, 'utf-8');
  fs.renameSync(tempPath, configPath);
}

export function addServer(
  configPath: string,
  format: string,
  serverId: string,
  serverConfig: { command: string; args?: string[]; env?: Record<string, string> }
): void {
  const config = readConfig(configPath, format);
  config.mcpServers[serverId] = serverConfig;
  writeConfig(configPath, config, format);
}

export function removeServer(configPath: string, format: string, serverId: string): void {
  const config = readConfig(configPath, format);
  delete config.mcpServers[serverId];
  writeConfig(configPath, config, format);
}

export function serverExists(configPath: string, format: string, serverId: string): boolean {
  const config = readConfig(configPath, format);
  return !!config.mcpServers[serverId];
}
