import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  getGlobalConfig,
  saveGlobalConfig,
  GLOBAL_CONFIG_DIR_NAME,
  GLOBAL_CONFIG_FILE_NAME,
} from '../../src/core/global-config.js';
import type { Profile } from '../../src/core/global-config.js';

describe('global-config', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-global-config-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleErrorSpy.mockRestore();
  });

  it('exports the expected config constants', () => {
    expect(GLOBAL_CONFIG_DIR_NAME).toBe('openspec');
    expect(GLOBAL_CONFIG_FILE_NAME).toBe('config.json');
  });

  it('uses XDG_CONFIG_HOME when set', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    expect(getGlobalConfigDir()).toBe(path.join(tempDir, 'openspec'));
    expect(getGlobalConfigPath()).toBe(path.join(tempDir, 'openspec', 'config.json'));
  });

  it('returns defaults when config file does not exist', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    expect(getGlobalConfig()).toEqual({ featureFlags: {}, profile: 'core' });
  });

  it('returns defaults and logs a warning for invalid JSON', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), '{ invalid json }');

    expect(getGlobalConfig()).toEqual({ featureFlags: {}, profile: 'core' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
  });

  it('merges stored config with defaults', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ featureFlags: { existingFlag: true } })
    );

    const config = getGlobalConfig();
    expect(config.profile).toBe('core');
    expect(config.workflows).toBeUndefined();
    expect(config.featureFlags?.existingFlag).toBe(true);
  });

  it('preserves explicit workflow settings from config', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({
        featureFlags: {},
        profile: 'custom',
        workflows: ['propose', 'review'],
      })
    );

    const config = getGlobalConfig();
    expect(config.profile).toBe('custom');
    expect(config.workflows).toEqual(['propose', 'review']);
  });

  it('strips legacy delivery when saving', () => {
    process.env.XDG_CONFIG_HOME = tempDir;

    saveGlobalConfig({
      featureFlags: { flag1: true },
      profile: 'custom' as Profile,
      workflows: ['propose'],
      delivery: 'commands',
    } as Profile extends never ? never : any);

    const configPath = getGlobalConfigPath();
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(parsed.delivery).toBeUndefined();

    const loadedConfig = getGlobalConfig();
    expect(loadedConfig.profile).toBe('custom');
    expect(loadedConfig.workflows).toEqual(['propose']);
  });

  it('writes formatted JSON with a trailing newline', () => {
    process.env.XDG_CONFIG_HOME = tempDir;
    saveGlobalConfig({ featureFlags: {} });

    const content = fs.readFileSync(getGlobalConfigPath(), 'utf-8');
    expect(content.endsWith('\n')).toBe(true);
  });
});
