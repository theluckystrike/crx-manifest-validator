# crx-manifest-validator

Validate Chrome Extension manifest.json files for common errors and best practices.

## Installation

```bash
npm install -g crx-manifest-validator
```

## Usage

```bash
# Validate a manifest file
crx-manifest-validator manifest.json

# Validate from stdin
cat manifest.json | crx-manifest-validator

# Output in JSON format
crx-manifest-validator --json manifest.json
```

## Features

- **Manifest V2 & V3 support** — Validates both manifest versions
- **Required fields** — Checks for missing name, version, manifest_version
- **Name validation** — Warns about empty names, names too long (>45 chars), invalid characters
- **Version validation** — Checks for valid version format (dot-separated integers)
- **Host permissions** — Warns about dangerous `<all_urls>` and invalid patterns
- **Permissions** — Flags restricted permissions requiring Chrome Web Store review
- **Content scripts** — Validates matches, js, and css arrays
- **Web accessible resources** — Validates V2 and V3 formats
- **Deprecation warnings** — Warns about deprecated V2 features in V3

## Exit Codes

- `0` — Manifest is valid
- `1` — Manifest has errors
- `2` — File not found or cannot be read

## Library Usage

```typescript
import { validateManifest, formatValidationResult } from 'crx-manifest-validator';

const manifest = {
  manifest_version: 3,
  name: 'My Extension',
  version: '1.0.0',
};

const result = validateManifest(manifest);

if (!result.valid) {
  console.log('Validation errors:', result.issues);
}

// Format as human-readable text
console.log(formatValidationResult(result, 'text'));

// Or as JSON
console.log(formatValidationResult(result, 'json'));
```

## License

MIT
