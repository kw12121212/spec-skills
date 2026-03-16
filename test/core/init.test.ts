import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { randomUUID } from 'crypto';

import { InitCommand } from '../../src/core/init.js';
import { saveGlobalConfig } from '../../src/core/global-config.js';
import {
  getCanonicalSkillFilePath,
  isManagedSkillLinkHealthySync,
} from '../../src/core/skill-links.js';

vi.mock('../../src/ui/welcome-screen.js', () => ({
  showWelcomeScreen: vi.fn(),
}));

async function exists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('InitCommand', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-init-test-${randomUUID()}`);
    configTempDir = path.join(os.tmpdir(), `openspec-config-test-${randomUUID()}`);
    await fsp.mkdir(testDir, { recursive: true });
    await fsp.mkdir(configTempDir, { recursive: true });

    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = configTempDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fsp.rm(testDir, { recursive: true, force: true });
    await fsp.rm(configTempDir, { recursive: true, force: true });
  });

  it('creates canonical skills and linked tool skills for Claude', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    const canonicalPropose = getCanonicalSkillFilePath(testDir, 'openspec-propose');
    const toolPropose = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');

    expect(await exists(path.join(testDir, 'openspec'))).toBe(true);
    expect(await exists(canonicalExplore)).toBe(true);
    expect(await exists(toolExplore)).toBe(true);
    expect(await exists(canonicalPropose)).toBe(true);
    expect(await exists(toolPropose)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalPropose, toolPropose)).toBe(true);
  });

  it('installs only the four supported tools with --tools all', async () => {
    await new InitCommand({ tools: 'all', force: true }).execute(testDir);

    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.codex', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.github', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.opencode', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(false);
  });

  it('skips tool configuration with --tools none', async () => {
    await new InitCommand({ tools: 'none', force: true }).execute(testDir);

    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(false);
    expect(await exists(path.join(testDir, 'openspec'))).toBe(true);
  });

  it('rejects invalid tool names outside the supported set', async () => {
    await expect(new InitCommand({ tools: 'cursor', force: true }).execute(testDir)).rejects.toThrow(
      'Invalid tool(s): cursor. Available values: all, none, claude, codex, github-copilot, opencode'
    );
  });

  it('refreshes linked skills and removes obsolete command files on re-run', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

    const legacyCommand = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
    await fsp.mkdir(path.dirname(legacyCommand), { recursive: true });
    await fsp.writeFile(legacyCommand, '# obsolete\n', 'utf-8');

    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await exists(legacyCommand)).toBe(false);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
  });

  it('respects a custom workflow profile from global config', async () => {
    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      workflows: ['explore', 'new'],
    });

    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-new-change', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(false);
  });

  it('uses the --profile override over the saved global config', async () => {
    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      workflows: ['explore', 'new'],
    });

    await new InitCommand({ tools: 'claude', force: true, profile: 'core' }).execute(testDir);

    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-new-change', 'SKILL.md'))).toBe(false);
  });

  it('uses detected supported tools in non-interactive mode when no --tools flag is provided', async () => {
    await fsp.mkdir(path.join(testDir, '.github'), { recursive: true });

    await new InitCommand({ interactive: false, force: true }).execute(testDir);

    expect(await exists(path.join(testDir, '.github', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(await exists(path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(false);
  });

  it('auto-cleans up supported legacy command files and replaces them with linked skills', async () => {
    const legacyCommand = path.join(testDir, '.opencode', 'command', 'opsx-propose.md');
    await fsp.mkdir(path.dirname(legacyCommand), { recursive: true });
    await fsp.writeFile(legacyCommand, '# legacy\n', 'utf-8');

    await new InitCommand({ tools: 'opencode' }).execute(testDir);

    const canonicalPropose = getCanonicalSkillFilePath(testDir, 'openspec-propose');
    const toolPropose = path.join(testDir, '.opencode', 'skills', 'openspec-propose', 'SKILL.md');
    expect(await exists(legacyCommand)).toBe(false);
    expect(await exists(toolPropose)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalPropose, toolPropose)).toBe(true);
  });

  it('rejects invalid profile overrides', async () => {
    await expect(
      new InitCommand({ tools: 'claude', force: true, profile: 'invalid-profile' }).execute(testDir)
    ).rejects.toThrow(/Invalid profile "invalid-profile"/);
  });

  it('writes generatedBy metadata into canonical skills', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const content = await fsp.readFile(canonicalExplore, 'utf-8');
    expect(content).toContain('generatedBy:');
    expect(content).toContain('name: openspec-explore');
  });

  it('creates GitHub Copilot skill links under .github/skills', async () => {
    await new InitCommand({ tools: 'github-copilot', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.github', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await exists(toolExplore)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
  });

  it('creates Codex skill links under .codex/skills', async () => {
    await new InitCommand({ tools: 'codex', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.codex', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await exists(toolExplore)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
  });

  it('creates OpenCode skill links under .opencode/skills', async () => {
    await new InitCommand({ tools: 'opencode', force: true }).execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.opencode', 'skills', 'openspec-explore', 'SKILL.md');
    expect(await exists(toolExplore)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
  });
});
