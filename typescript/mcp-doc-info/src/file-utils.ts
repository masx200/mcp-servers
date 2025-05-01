import { mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SoftwareType } from './types';

const execAsync = promisify(exec);

export async function ensureDir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  await fsWriteFile(path, content);
}

export async function exists(path: string): Promise<boolean> {
  return existsSync(path);
}

export async function openFile(path: string, software: SoftwareType): Promise<void> {
  const command = process.platform === 'win32' 
    ? `start "" "${path}"`
    : process.platform === 'darwin'
      ? `open "${path}"`
      : `xdg-open "${path}"`;

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
  }
} 