import { describe, it, expect } from 'vitest';
import { validateManifest, formatValidationResult } from '../src/validator.js';

describe('crx-manifest-validator', () => {
  describe('validateManifest', () => {
    it('should validate a valid Manifest V3', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.manifestVersion).toBe(3);
      expect(result.summary.errors).toBe(0);
    });

    it('should validate a valid Manifest V2', () => {
      const manifest = {
        manifest_version: 2,
        name: 'Test Extension',
        version: '1.0.0',
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.manifestVersion).toBe(2);
    });

    it('should reject invalid manifest version', () => {
      const manifest = {
        manifest_version: 4,
        name: 'Test',
        version: '1.0.0',
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe('INVALID_MANIFEST_VERSION');
    });

    it('should reject missing required fields', () => {
      const manifest = {
        manifest_version: 3,
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });

    it('should warn about empty name', () => {
      const manifest = {
        manifest_version: 3,
        name: '',
        version: '1.0.0',
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'EMPTY_NAME')).toBe(true);
    });

    it('should warn about name too long', () => {
      const manifest = {
        manifest_version: 3,
        name: 'a'.repeat(50),
        version: '1.0.0',
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'NAME_TOO_LONG')).toBe(true);
    });

    it('should warn about invalid version format', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0-beta',
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should warn about all_urls host permission', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        host_permissions: ['<all_urls>'],
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'DANGEROUS_HOST_PERMISSION')).toBe(true);
    });

    it('should warn about persistent background in V2', () => {
      const manifest = {
        manifest_version: 2,
        name: 'Test',
        version: '1.0.0',
        background: {
          scripts: ['background.js'],
          persistent: true,
        },
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'PERSISTENT_BACKGROUND')).toBe(true);
    });

    it('should error on browser_action in V3', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        browser_action: {},
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'FORBIDDEN_BROWSER_ACTION')).toBe(true);
    });

    it('should error on page_action in V3', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        page_action: {},
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'FORBIDDEN_PAGE_ACTION')).toBe(true);
    });

    it('should warn about deprecated options_page in V3', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        options_page: 'options.html',
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'DEPRECATED_OPTIONS_PAGE')).toBe(true);
    });

    it('should warn about restricted permissions', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: ['bookmarks', 'geolocation'],
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'RESTRICTED_PERMISSION')).toBe(true);
    });

    it('should suggest activeTab when using tabs permission', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: ['tabs'],
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'SUGGEST_ACTIVE_TAB')).toBe(true);
    });

    it('should error on missing content_scripts matches', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        content_scripts: [{}],
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'CONTENT_SCRIPT_MISSING_MATCHES')).toBe(true);
    });

    it('should validate valid content_scripts', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        content_scripts: [{
          matches: ['<all_urls>'],
          js: ['content.js'],
          css: ['styles.css'],
        }],
      };
      const result = validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'CONTENT_SCRIPT_MISSING_MATCHES')).toBe(false);
    });

    it('should validate web_accessible_resources V3', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        web_accessible_resources: [{
          resources: ['images/*'],
          matches: ['<all_urls>'],
        }],
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it('should reject non-array manifest', () => {
      const result = validateManifest('not an object');
      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe('INVALID_MANIFEST');
    });
  });

  describe('formatValidationResult', () => {
    it('should format valid manifest as text', () => {
      const result = validateManifest({
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      });
      const output = formatValidationResult(result, 'text');
      expect(output).toContain('VALID');
      expect(output).toContain('V3');
    });

    it('should format invalid manifest as text', () => {
      const result = validateManifest({
        manifest_version: 3,
      });
      const output = formatValidationResult(result, 'text');
      expect(output).toContain('INVALID');
      expect(output).toContain('ERROR');
    });

    it('should format as JSON', () => {
      const result = validateManifest({
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      });
      const output = formatValidationResult(result, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(true);
      expect(parsed.manifestVersion).toBe(3);
    });
  });
});
