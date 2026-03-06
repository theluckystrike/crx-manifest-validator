# crx-manifest-validator

Validate Chrome Extension manifest.json files against Manifest V2 and V3 specs. Catches missing required fields, deprecated keys, dangerous host permissions, invalid content script configs, and Chrome Web Store review flags. Works as a CLI tool and a Node.js library.

INSTALL

```bash
npm install crx-manifest-validator
```

CLI USAGE

```bash
crx-manifest-validator manifest.json

crx-manifest-validator --json manifest.json

cat manifest.json | crx-manifest-validator
```

Options

    -h, --help     Show help message
    -j, --json     Output in JSON format

Exit codes

    0    Manifest is valid
    1    Manifest has errors
    2    File not found or cannot be read

LIBRARY USAGE

```typescript
import { validateManifest, formatValidationResult } from 'crx-manifest-validator';

const manifest = {
  manifest_version: 3,
  name: 'My-Extension',
  version: '1.0.0',
  permissions: ['tabs', 'cookies'],
  host_permissions: ['<all_urls>'],
};

const result = validateManifest(manifest);

console.log(result.valid);           // true when zero errors (warnings are OK)
console.log(result.manifestVersion); // 3
console.log(result.summary);         // { errors: 0, warnings: 2, infos: 1 }

// Human-readable output
console.log(formatValidationResult(result, 'text'));

// Structured JSON output
console.log(formatValidationResult(result, 'json'));
```

API

validateManifest(manifest)

Accepts a parsed manifest object (the result of JSON.parse on a manifest.json file). Returns a ValidationResult.

```typescript
interface ValidationResult {
  valid: boolean;
  manifestVersion: 2 | 3;
  issues: ValidationIssue[];
  summary: { errors: number; warnings: number; infos: number };
}

interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;
}
```

formatValidationResult(result, format?)

Formats a ValidationResult as either 'text' (default) or 'json'.

EXPORTED TYPES

Manifest, ManifestV2, ManifestV3, ValidationResult, ValidationIssue, ValidationSeverity, ContentScript, WebAccessibleResourceV2, WebAccessibleResourceV3, ExtensionAction, OptionsUI, TTSEngine, TTSVoice, Requirements, SidePanel

WHAT IT CHECKS

Required fields
    manifest_version, name, version

Name and version format
    Length limits, valid characters, dot-separated integer format

V3 forbidden keys
    browser_action, page_action, background.scripts

V2 deprecations
    Persistent background pages, browser_action migration notice

Host permissions
    Dangerous patterns like <all_urls>, http://*/*, missing scheme

Permissions
    Restricted permissions flagged for Chrome Web Store review, tabs vs activeTab suggestion

Content scripts
    Missing matches field, invalid js/css arrays

Web accessible resources
    V2 string array and object formats, V3 object format with resources and matches

DEVELOPMENT

```bash
git clone https://github.com/theluckystrike/crx-manifest-validator.git
cd crx-manifest-validator
npm install
npm test
npm run build
```

Requires Node.js 18 or later. Tests use Vitest. TypeScript source lives in src/ and compiles to dist/.

CONTRIBUTING

See CONTRIBUTING.md for guidelines on reporting issues, development workflow, code style, and testing.

LICENSE

MIT. See LICENSE file.

---

Built by theluckystrike. Visit zovo.one for more tools and projects.
