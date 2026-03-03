# @zovo/crx-manifest-validator

[![CI](https://github.com/theluckystrike/crx-manifest-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/theluckystrike/crx-manifest-validator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Validate Chrome Extension `manifest.json` files against Manifest V2 and V3 specs. Catches missing required fields, deprecated keys, dangerous host permissions, invalid content script configs, and Chrome Web Store review flags. CLI tool and Node.js library.

## Install

```bash
npm install @zovo/crx-manifest-validator
```

## Quick Start

### CLI

```bash
# Validate a manifest file
npx @zovo/crx-manifest-validator manifest.json

# JSON output
npx @zovo/crx-manifest-validator --json manifest.json

# Read from stdin
cat manifest.json | npx @zovo/crx-manifest-validator
```

Exit codes: `0` = valid, `1` = has errors, `2` = file not found or invalid JSON.

### Library

```typescript
import { validateManifest, formatValidationResult } from '@zovo/crx-manifest-validator';

const manifest = {
  manifest_version: 3,
  name: 'My Extension',
  version: '1.0.0',
  permissions: ['tabs', 'cookies'],
  host_permissions: ['<all_urls>'],
};

const result = validateManifest(manifest);

console.log(result.valid);          // false (warnings present)
console.log(result.manifestVersion); // 3
console.log(result.summary);        // { errors: 0, warnings: 2, infos: 1 }

// Human-readable output
console.log(formatValidationResult(result, 'text'));

// JSON output
console.log(formatValidationResult(result, 'json'));
```

## API

### `validateManifest(manifest)`

Validates a parsed manifest object. Returns `ValidationResult`.

```typescript
interface ValidationResult {
  valid: boolean;              // true if zero errors (warnings are OK)
  manifestVersion: 2 | 3;
  issues: ValidationIssue[];
  summary: { errors: number; warnings: number; infos: number };
}

interface ValidationIssue {
  code: string;                // e.g. 'MISSING_REQUIRED_FIELD'
  message: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;              // e.g. 'manifest_version'
}
```

### `formatValidationResult(result, format?)`

Formats results as `'text'` (default) or `'json'`.

## What It Checks

| Category | Examples |
|----------|---------|
| **Required fields** | `manifest_version`, `name`, `version` |
| **Name/version format** | Length limits, valid characters, semver-like format |
| **V3 forbidden keys** | `browser_action`, `page_action`, `background.scripts` |
| **V2 deprecations** | Persistent background pages, `browser_action` |
| **Host permissions** | Dangerous patterns like `<all_urls>`, `http://*/*` |
| **Permissions** | Restricted permissions flagged for CWS review |
| **Content scripts** | Missing `matches`, invalid `js`/`css` arrays |
| **Web accessible resources** | V2 vs V3 format validation |

## Related

- [crx-permission-analyzer](https://github.com/theluckystrike/crx-permission-analyzer) -- Analyze Chrome extension permissions
- [crx-extension-size-analyzer](https://github.com/theluckystrike/crx-extension-size-analyzer) -- Analyze extension bundle size
- [chrome-extension-starter-mv3](https://github.com/theluckystrike/chrome-extension-starter-mv3) -- Production-ready MV3 starter template

## License

MIT -- [Zovo](https://zovo.one)
