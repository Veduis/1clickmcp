import * as vscode from 'vscode';

export async function promptForEnvVars(
  envVars: Record<string, string>
): Promise<Record<string, string> | undefined> {
  const result: Record<string, string> = {};

  for (const [key, description] of Object.entries(envVars)) {
    const value = await vscode.window.showInputBox({
      prompt: `Enter value for ${key}`,
      placeHolder: description,
      password: key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'),
      ignoreFocusOut: true
    });

    if (value === undefined) {
      // User cancelled
      return undefined;
    }

    result[key] = value;
  }

  return result;
}
