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
      let manifest: unknown;
      try {
        manifest = JSON.parse(stdinContent);
      } catch (parseError) {
        const err = parseError as SyntaxError;
        console.error(`Error: Invalid JSON from stdin: ${err.message}`);
        console.error('Hint: Ensure the JSON is valid. For example: cat manifest.json | crx-manifest-validator');
        console.error('Alternatively, provide the manifest path directly: crx-manifest-validator manifest.json');
        process.exit(2);
        return;
      }
      const result = validateManifest(manifest);
      console.log(formatValidationResult(result, args.format));
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT' || err.message?.includes('Bad file descriptor')) {
        console.error('Error: No manifest path provided and stdin is not receiving valid input.');
        console.error('Use --help for usage information.');
        console.error('Examples:');
        console.error('  crx-manifest-validator manifest.json');
        console.error('  cat manifest.json | crx-manifest-validator');
        process.exit(2);
        return;
      }
      console.error(`Error reading from stdin: ${err.message}`);
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
    let manifest: unknown;
    try {
      manifest = JSON.parse(content);
    } catch (parseError) {
      const err = parseError as SyntaxError;
      console.error(`Error: Invalid JSON in ${absolutePath}`);
      console.error(`Details: ${err.message}`);
      console.error('Hint: Check for missing commas, trailing commas, unclosed brackets, or invalid JSON syntax.');
      process.exit(2);
      return;
    }
    const result = validateManifest(manifest);
    console.log(formatValidationResult(result, args.format));
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.error(`Error: File not found: ${absolutePath}`);
      console.error('Hint: Check that the file path is correct and the file exists.');
      process.exit(2);
    }
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`Error: Permission denied: Cannot read ${absolutePath}`);
      console.error('Hint: Check file permissions with ls -la.');
      process.exit(2);
    }
    console.error(`Error reading file: ${err.message}`);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(2);
});
