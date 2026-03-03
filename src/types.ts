// Chrome Extension Manifest Types (V2 and V3)

export interface ManifestBase {
  manifest_version: 2 | 3;
  name: string;
  version: string;
  description?: string;
  default_locale?: string;
  icons?: Record<string, string>;
  author?: string;
  homepage_url?: string;
  short_name?: string;
}

export interface ManifestV2 extends ManifestBase {
  manifest_version: 2;
  background?: {
    scripts?: string[];
    page?: string;
    persistent?: boolean;
  };
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: ContentScript[];
  web_accessible_resources?: string[] | WebAccessibleResourceV2[];
  browser_action?: ExtensionAction;
  page_action?: ExtensionAction;
  options_page?: string;
  options_ui?: OptionsUI;
  devtools_page?: string;
  omnibox?: { keyword: string };
  tts_engine?: TTSEngine;
  user_scripts?: UserScripts;
  sandbox?: Sandbox;
  requirements?: Requirements;
  update_url?: string;
}

export interface ManifestV3 extends ManifestBase {
  manifest_version: 3;
  background?: {
    service_worker?: string;
    type?: 'module';
  };
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[] | string;
  optional_host_permissions?: string[] | string;
  content_scripts?: ContentScript[];
  web_accessible_resources?: WebAccessibleResourceV3[];
  action?: ExtensionAction;
  options_page?: string;
  options_ui?: OptionsUI;
  devtools_page?: string;
  omnibox?: { keyword: string };
  tts_engine?: TTSEngine;
  sandbox?: Sandbox;
  requirements?: Requirements;
  update_url?: string;
  side_panel?: SidePanel;
  storage?: { async?: boolean };
}

export interface ContentScript {
  matches: string[];
  css?: string[];
  js?: string[];
  run_at?: 'document_idle' | 'document_start' | 'document_end';
  match_about_blank?: boolean;
  all_frames?: boolean;
  include_globs?: string[];
  exclude_globs?: string[];
}

export interface WebAccessibleResourceV2 {
  resources: string[];
  matches: string[];
}

export interface WebAccessibleResourceV3 {
  resources: string[];
  matches: string[];
  use_dynamic_url?: boolean;
}

export interface ExtensionAction {
  default_icon?: string | Record<string, string>;
  default_title?: string;
  default_popup?: string;
}

export interface OptionsUI {
  page: string;
  open_in_tab?: boolean;
  browser_style?: boolean;
}

export interface TTSEngine {
  voices: TTSVoice[];
}

export interface TTSVoice {
  voice_name: string;
  lang?: string;
  gender?: string;
  event_listener?: string;
}

export interface UserScripts {
  api_script?: string;
}

export interface Sandbox {
  pages: string[];
  content_security_policy?: string;
}

export interface Requirements {
  '3D'?: Record<string, never>;
  plugins?: Record<string, never>;
  native_client?: Record<string, never>;
}

export interface SidePanel {
  default_path: string;
}

export type Manifest = ManifestV2 | ManifestV3;

// Validation Result Types
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  manifestVersion: 2 | 3;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}
