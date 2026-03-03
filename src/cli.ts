#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { validateManifest, formatValidationResult } from './validator.js';

interface CLIArgs {
  manifestPath?: string;
  format: 'json' | 'text';
  help: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    format: 'text',
    help: false,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-j' || arg === '--json') {
      result.format = 'json';
    } else if (!arg.startsWith('-')) {
      result.manifestPath = arg;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
crx-manifest-validator — Validate Chrome Extension Manifest Files

USAGE:
  crx-manifest-validator [OPTIONS] [manifest.json]

OPTIONS:
  -h, --help     Show this help message
  -j, --json     Output in JSON format

EXAMPLES:
  crx-manifest-validator manifest.json
  crx-manifest-validator --json manifest.json
  cat manifest.json | crx-manifest-validator

EXIT CODES:
  0 - Manifest is valid
  1 - Manifest has errors
  2 - File not found or cannot be read
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  let manifestPath = args.manifestPath;

  // If no path provided, try to read from stdin
  if (!manifestPath) {
    try {
      const stdinContent = await readFile('/dev/stdin', 'utf-8');
      const manifest = JSON.parse(stdinContent);
      const result = validateManifest(manifest);
      console.log(formatValidationResult(result, args.format));
      process.exit(result.valid ? 0 : 1);
    } catch {
      console.error('Error: No manifest path provided and stdin is not a valid JSON file.');
      console.error('Use --help for usage information.');
      process.exit(2);
    }
  }

  // Resolve absolute or relative path
  const absolutePath = isAbsolute(manifestPath)
    ? manifestPath
    : resolve(process.cwd(), manifestPath);

  try {
    const content = await readFile(absolutePath, 'utf-8');
    const manifest = JSON.parse(content);
    const result = validateManifest(manifest);
    console.log(formatValidationResult(result, args.format));
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${absolutePath}`);
      process.exit(2);
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: ${absolutePath}`);
      process.exit(2);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(2);
});
