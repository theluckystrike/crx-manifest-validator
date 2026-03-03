import type { Manifest, ManifestV2, ManifestV3, ValidationIssue, ValidationResult, ValidationSeverity, WebAccessibleResourceV2 } from './types.js';

// Known dangerous host patterns
const DANGEROUS_HOST_PATTERNS = [
  '<all_urls>',
  'http://*/*',
  'https://*/*',
  'http://localhost/*',
];

// Required fields for both manifest versions
const REQUIRED_FIELDS = ['manifest_version', 'name', 'version'];

// Permissions that require explicit justification
const RESTRICTED_PERMISSIONS = [
  'bookmarks',
  'clipboardRead',
  'clipboardWrite',
  'contentSettings',
  'debugger',
  'downloads',
  'geolocation',
  'history',
  'management',
  'pageCapture',
  'privacy',
  'proxy',
  'system.cpu',
  'system.memory',
  'system.storage',
  'tabCapture',
  'tabGroups',
  'topSites',
  'tts',
  'ttsEngine',
  'webNavigation',
  'webRequest',
  'webRequestBlocking',
];

export function validateManifest(manifest: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check if it's a valid object
  if (!manifest || typeof manifest !== 'object') {
    return {
      valid: false,
      manifestVersion: 2,
      issues: [{
        code: 'INVALID_MANIFEST',
        message: 'Manifest must be a valid JSON object',
        severity: 'error',
      }],
      summary: { errors: 1, warnings: 0, infos: 0 },
    };
  }

  const m = manifest as Record<string, unknown>;

  // Check manifest_version
  if (m.manifest_version === undefined) {
    issues.push({
      code: 'MISSING_MANIFEST_VERSION',
      message: 'Missing required field: manifest_version',
      severity: 'error',
      field: 'manifest_version',
    });
    return createResult(issues, 2);
  }

  const manifestVersion = Number(m.manifest_version) as 2 | 3;
  if (manifestVersion !== 2 && manifestVersion !== 3) {
    issues.push({
      code: 'INVALID_MANIFEST_VERSION',
      message: `Invalid manifest_version: ${m.manifest_version}. Must be 2 or 3`,
      severity: 'error',
      field: 'manifest_version',
    });
    return createResult(issues, 2);
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (m[field] === undefined) {
      issues.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: `Missing required field: ${field}`,
        severity: 'error',
        field,
      });
    }
  }

  // Validate name
  if (typeof m.name === 'string') {
    if (m.name.length === 0) {
      issues.push({
        code: 'EMPTY_NAME',
        message: 'Extension name cannot be empty',
        severity: 'error',
        field: 'name',
      });
    }
    if (m.name.length > 45) {
      issues.push({
        code: 'NAME_TOO_LONG',
        message: `Extension name too long (${m.name.length}/45 chars). Will be truncated in Chrome Web Store.`,
        severity: 'warning',
        field: 'name',
      });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(m.name)) {
      issues.push({
        code: 'INVALID_NAME',
        message: 'Extension name should only contain letters, numbers, hyphens, and underscores',
        severity: 'warning',
        field: 'name',
      });
    }
  } else if (m.name !== undefined) {
    issues.push({
      code: 'INVALID_NAME_TYPE',
      message: 'Extension name must be a string',
      severity: 'error',
      field: 'name',
    });
  }

  // Validate version
  if (typeof m.version === 'string') {
    if (!/^\d+(\.\d+)*$/.test(m.version)) {
      issues.push({
        code: 'INVALID_VERSION',
        message: 'Version must be a dot-separated sequence of integers (e.g., 1.0.0)',
        severity: 'error',
        field: 'version',
      });
    }
    if (m.version.length > 128) {
      issues.push({
        code: 'VERSION_TOO_LONG',
        message: 'Version string too long (max 128 characters)',
        severity: 'error',
        field: 'version',
      });
    }
  } else if (m.version !== undefined) {
    issues.push({
      code: 'INVALID_VERSION_TYPE',
      message: 'Version must be a string',
      severity: 'error',
      field: 'version',
    });
  }

  // Version-specific validations
  if (manifestVersion === 2) {
    validateManifestV2(m, issues);
  } else {
    validateManifestV3(m, issues);
  }

  return createResult(issues, manifestVersion);
}

function validateManifestV2(manifest: Record<string, unknown>, issues: ValidationIssue[]): void {
  // Check for persistent background script (deprecated in V2, required V3 migration)
  const background = manifest.background as Record<string, unknown> | undefined;
  if (background?.persistent === true) {
    issues.push({
      code: 'PERSISTENT_BACKGROUND',
      message: 'Persistent background pages are deprecated. Migrate to service worker (Manifest V3).',
      severity: 'warning',
      field: 'background.persistent',
    });
  }

  // Check for deprecated browser_action/page_action in favor of action
  if (manifest.browser_action) {
    issues.push({
      code: 'DEPRECATED_BROWSER_ACTION',
      message: 'browser_action is deprecated in Manifest V2. Consider migrating to Manifest V3.',
      severity: 'info',
      field: 'browser_action',
    });
  }

  // Validate web_accessible_resources
  const webAccessibleResources = manifest.web_accessible_resources;
  if (webAccessibleResources) {
    validateWebAccessibleResourcesV2(webAccessibleResources, issues);
  }

  // Check host permissions
  const hostPermissions = manifest.host_permissions;
  const optionalHostPermissions = manifest.optional_host_permissions;
  if (Array.isArray(hostPermissions)) {
    validateHostPermissions(hostPermissions, issues, 'host_permissions');
  }
  if (Array.isArray(optionalHostPermissions)) {
    validateHostPermissions(optionalHostPermissions, issues, 'optional_host_permissions');
  }

  // Check permissions
  const permissions = manifest.permissions;
  const optionalPermissions = manifest.optional_permissions;
  if (Array.isArray(permissions)) {
    validatePermissions(permissions, issues, 'permissions');
  }
  if (Array.isArray(optionalPermissions)) {
    validatePermissions(optionalPermissions, issues, 'optional_permissions');
  }

  // Validate content scripts
  const contentScripts = manifest.content_scripts;
  if (Array.isArray(contentScripts)) {
    validateContentScripts(contentScripts, issues);
  }
}

function validateManifestV3(manifest: Record<string, unknown>, issues: ValidationIssue[]): void {
  // Check for forbidden V2-only features
  if (manifest.browser_action) {
    issues.push({
      code: 'FORBIDDEN_BROWSER_ACTION',
      message: 'browser_action is not allowed in Manifest V3. Use "action" instead.',
      severity: 'error',
      field: 'browser_action',
    });
  }

  if (manifest.page_action) {
    issues.push({
      code: 'FORBIDDEN_PAGE_ACTION',
      message: 'page_action is not allowed in Manifest V3. Use "action" instead.',
      severity: 'error',
      field: 'page_action',
    });
  }

  if (manifest.options_page) {
    issues.push({
      code: 'DEPRECATED_OPTIONS_PAGE',
      message: 'options_page is deprecated in Manifest V3. Use options_ui instead.',
      severity: 'warning',
      field: 'options_page',
    });
  }

  // Check for Manifest V2 background scripts (not allowed in V3)
  const background = manifest.background as Record<string, unknown> | undefined;
  if (background && 'scripts' in background) {
    issues.push({
      code: 'FORBIDDEN_BACKGROUND_SCRIPTS',
      message: 'background.scripts is not allowed in Manifest V3. Use background.service_worker instead.',
      severity: 'error',
      field: 'background.scripts',
    });
  }

  // Validate web_accessible_resources (different format in V3)
  const webAccessibleResources = manifest.web_accessible_resources;
  if (webAccessibleResources) {
    validateWebAccessibleResourcesV3(webAccessibleResources, issues);
  }

  // Check host permissions
  const hostPermissions = manifest.host_permissions;
  const optionalHostPermissions = manifest.optional_host_permissions;
  if (Array.isArray(hostPermissions)) {
    validateHostPermissions(hostPermissions, issues, 'host_permissions');
  }
  if (Array.isArray(optionalHostPermissions)) {
    validateHostPermissions(optionalHostPermissions, issues, 'optional_host_permissions');
  }

  // Check permissions
  const permissions = manifest.permissions;
  const optionalPermissions = manifest.optional_permissions;
  if (Array.isArray(permissions)) {
    validatePermissions(permissions, issues, 'permissions');
  }
  if (Array.isArray(optionalPermissions)) {
    validatePermissions(optionalPermissions, issues, 'optional_permissions');
  }

  // Validate content scripts
  const contentScripts = manifest.content_scripts;
  if (Array.isArray(contentScripts)) {
    validateContentScripts(contentScripts, issues);
  }
}

function validateHostPermissions(
  hostPermissions: unknown[],
  issues: ValidationIssue[],
  field: string
): void {
  for (const host of hostPermissions) {
    if (typeof host !== 'string') continue;
    
    if (DANGEROUS_HOST_PATTERNS.includes(host)) {
      issues.push({
        code: 'DANGEROUS_HOST_PERMISSION',
        message: `Dangerous host permission: "${host}". This grants access to all URLs.`,
        severity: 'warning',
        field,
      });
    }

    if (!host.includes('://') && !host.startsWith('*://') && !host.startsWith('<all_urls>')) {
      issues.push({
        code: 'INVALID_HOST_PATTERN',
        message: `Host permission "${host}" should include a scheme (http://, https://) or use *:// for all schemes.`,
        severity: 'warning',
        field,
      });
    }
  }
}

function validatePermissions(
  permissions: unknown[],
  issues: ValidationIssue[],
  field: string
): void {
  for (const perm of permissions) {
    if (typeof perm !== 'string') continue;
    
    // Check for restricted permissions
    if (RESTRICTED_PERMISSIONS.includes(perm)) {
      issues.push({
        code: 'RESTRICTED_PERMISSION',
        message: `"${perm}" requires careful review for Chrome Web Store approval.`,
        severity: 'info',
        field,
      });
    }

    // Check for common mistakes
    if (perm === 'tabs' && !permissions.includes('activeTab')) {
      issues.push({
        code: 'SUGGEST_ACTIVE_TAB',
        message: 'Consider using "activeTab" instead of "tabs" for better user privacy.',
        severity: 'info',
        field,
      });
    }

    // Check for all_urls permission
    if (perm === '<all_urls>') {
      issues.push({
        code: 'ALL_URLS_PERMISSION',
        message: '"<all_urls>" grants access to all URLs. Consider using specific host patterns.',
        severity: 'warning',
        field,
      });
    }
  }
}

function validateContentScripts(
  contentScripts: unknown,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(contentScripts)) {
    issues.push({
      code: 'INVALID_CONTENT_SCRIPTS',
      message: 'content_scripts must be an array',
      severity: 'error',
      field: 'content_scripts',
    });
    return;
  }

  for (let i = 0; i < contentScripts.length; i++) {
    const cs = contentScripts[i] as Record<string, unknown>;

    if (!cs.matches || !Array.isArray(cs.matches) || (cs.matches as unknown[]).length === 0) {
      issues.push({
        code: 'CONTENT_SCRIPT_MISSING_MATCHES',
        message: `content_scripts[${i}] is missing required "matches" field`,
        severity: 'error',
        field: `content_scripts[${i}].matches`,
      });
    }

    if (cs.js && !Array.isArray(cs.js)) {
      issues.push({
        code: 'CONTENT_SCRIPT_INVALID_JS',
        message: `content_scripts[${i}].js must be an array`,
        severity: 'error',
        field: `content_scripts[${i}].js`,
      });
    }

    if (cs.css && !Array.isArray(cs.css)) {
      issues.push({
        code: 'CONTENT_SCRIPT_INVALID_CSS',
        message: `content_scripts[${i}].css must be an array`,
        severity: 'error',
        field: `content_scripts[${i}].css`,
      });
    }
  }
}

function validateWebAccessibleResourcesV2(
  resources: unknown,
  issues: ValidationIssue[]
): void {
  if (Array.isArray(resources) && resources.length > 0 && typeof resources[0] === 'string') {
    // V2 simple format: just an array of strings
    return;
  }

  if (!Array.isArray(resources)) {
    return;
  }

  // V2 complex format
  for (let i = 0; i < resources.length; i++) {
    const res = resources[i] as Record<string, unknown>;
    if (!res.resources || !Array.isArray(res.resources)) {
      issues.push({
        code: 'INVALID_WEB_ACCESSIBLE_RESOURCES',
        message: `web_accessible_resources[${i}] missing "resources" array`,
        severity: 'error',
        field: `web_accessible_resources[${i}]`,
      });
    }
    if (!res.matches || !Array.isArray(res.matches)) {
      issues.push({
        code: 'INVALID_WEB_ACCESSIBLE_RESOURCES',
        message: `web_accessible_resources[${i}] missing "matches" array`,
        severity: 'error',
        field: `web_accessible_resources[${i}]`,
      });
    }
  }
}

function validateWebAccessibleResourcesV3(
  resources: unknown,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(resources)) {
    issues.push({
      code: 'INVALID_WEB_ACCESSIBLE_RESOURCES_V3',
      message: 'web_accessible_resources must be an array in Manifest V3',
      severity: 'error',
      field: 'web_accessible_resources',
    });
    return;
  }

  for (let i = 0; i < resources.length; i++) {
    const res = resources[i] as Record<string, unknown>;

    if (!res.resources || !Array.isArray(res.resources)) {
      issues.push({
        code: 'INVALID_WEB_ACCESSIBLE_RESOURCES',
        message: `web_accessible_resources[${i}] missing "resources" array`,
        severity: 'error',
        field: `web_accessible_resources[${i}].resources`,
      });
    }
    if (!res.matches || !Array.isArray(res.matches)) {
      issues.push({
        code: 'INVALID_WEB_ACCESSIBLE_RESOURCES',
        message: `web_accessible_resources[${i}] missing "matches" array`,
        severity: 'error',
        field: `web_accessible_resources[${i}].matches`,
      });
    }
  }
}

function createResult(issues: ValidationIssue[], version: 2 | 3): ValidationResult {
  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    infos: issues.filter(i => i.severity === 'info').length,
  };

  return {
    valid: summary.errors === 0,
    manifestVersion: version,
    issues,
    summary,
  };
}

export function formatValidationResult(result: ValidationResult, format: 'json' | 'text' = 'text'): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  let output = `Manifest Validation Results (V${result.manifestVersion})\n`;
  output += `${'='.repeat(50)}\n\n`;
  output += `Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;

  if (result.issues.length === 0) {
    output += 'No issues found.\n';
    return output;
  }

  output += `Summary: ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.infos} info\n\n`;

  const bySeverity: Record<ValidationSeverity, ValidationIssue[]> = {
    error: [],
    warning: [],
    info: [],
  };

  for (const issue of result.issues) {
    bySeverity[issue.severity].push(issue);
  }

  if (bySeverity.error.length > 0) {
    output += `❌ ERRORS (${bySeverity.error.length})\n`;
    output += `${'-'.repeat(40)}\n`;
    for (const issue of bySeverity.error) {
      output += `  [${issue.code}] ${issue.message}\n`;
      if (issue.field) {
        output += `          → ${issue.field}\n`;
      }
    }
    output += '\n';
  }

  if (bySeverity.warning.length > 0) {
    output += `⚠️  WARNINGS (${bySeverity.warning.length})\n`;
    output += `${'-'.repeat(40)}\n`;
    for (const issue of bySeverity.warning) {
      output += `  [${issue.code}] ${issue.message}\n`;
      if (issue.field) {
        output += `          → ${issue.field}\n`;
      }
    }
    output += '\n';
  }

  if (bySeverity.info.length > 0) {
    output += `ℹ️  INFO (${bySeverity.info.length})\n`;
    output += `${'-'.repeat(40)}\n`;
    for (const issue of bySeverity.info) {
      output += `  [${issue.code}] ${issue.message}\n`;
      if (issue.field) {
        output += `          → ${issue.field}\n`;
      }
    }
    output += '\n';
  }

  return output;
}
