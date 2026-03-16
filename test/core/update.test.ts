import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { randomUUID } from 'crypto';
import { UpdateCommand, scanInstalledWorkflows } from '../../src/core/update.js';
import { type GlobalConfig } from '../../src/core/global-config.js';
import { WORKFLOW_TO_SKILL_DIR } from '../../src/core/profile-sync-drift.js';
import {
  getCanonicalSkillFilePath,
  isManagedSkillLinkHealthySync,
} from '../../src/core/skill-links.js';

const mockState = {
  config: {
    featureFlags: {},
    profile: 'core' as const,
  } as GlobalConfig,
};

vi.mock('../../src/core/global-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/global-config.js')>();

  return {
    ...actual,
    getGlobalConfig: () => ({ ...mockState.config }),
    saveGlobalConfig: vi.fn(),
  };
});

function setMockConfig(config: GlobalConfig) {
  mockState.config = config;
}

function resetMockConfig() {
  mockState.config = { featureFlags: {}, profile: 'core' };
}

async function writeManagedSkill(
  projectDir: string,
  toolDir: string,
  workflowId: keyof typeof WORKFLOW_TO_SKILL_DIR,
  generatedBy = '0.9.0',
): Promise<void> {
  const dirName = WORKFLOW_TO_SKILL_DIR[workflowId];
  const sourceFile = getCanonicalSkillFilePath(projectDir, dirName);
  const targetFile = path.join(projectDir, toolDir, 'skills', dirName, 'SKILL.md');

  await fsp.mkdir(path.dirname(sourceFile), { recursive: true });
  await fsp.writeFile(
    sourceFile,
    `---\nname: ${dirName}\nmetadata:\n  generatedBy: "${generatedBy}"\n---\nold content\n`,
    'utf-8'
  );
  await fsp.mkdir(path.dirname(targetFile), { recursive: true });
  await fsp.link(sourceFile, targetFile);
}

async function writeLegacyCommand(projectDir: string, workflowId: string): Promise<void> {
  const commandFile = path.join(projectDir, '.claude', 'commands', 'opsx', `${workflowId}.md`);
  await fsp.mkdir(path.dirname(commandFile), { recursive: true });
  await fsp.writeFile(commandFile, '# obsolete\n', 'utf-8');
}

describe('UpdateCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-update-test-${randomUUID()}`);
    await fsp.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    resetMockConfig();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it('throws when the openspec directory is missing', async () => {
    await fsp.rm(path.join(testDir, 'openspec'), { recursive: true, force: true });

    await expect(new UpdateCommand().execute(testDir)).rejects.toThrow(
      "No OpenSpec directory found. Run 'openspec init' first."
    );
  });

  it('reports when no configured tools are present', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    await new UpdateCommand().execute(testDir);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No configured tools found'));
  });

  it('refreshes canonical skills and relinks tool skill files', async () => {
    await writeManagedSkill(testDir, '.claude', 'explore');

    await new UpdateCommand().execute(testDir);

    const canonicalExplore = getCanonicalSkillFilePath(testDir, 'openspec-explore');
    const toolExplore = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    const canonicalPropose = getCanonicalSkillFilePath(testDir, 'openspec-propose');
    const toolPropose = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');

    expect(fs.existsSync(canonicalExplore)).toBe(true);
    expect(fs.existsSync(toolExplore)).toBe(true);
    expect(fs.existsSync(canonicalPropose)).toBe(true);
    expect(fs.existsSync(toolPropose)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalExplore, toolExplore)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalPropose, toolPropose)).toBe(true);
  });

  it('removes obsolete command files while updating skills', async () => {
    await writeManagedSkill(testDir, '.claude', 'explore');
    await writeLegacyCommand(testDir, 'explore');

    await new UpdateCommand().execute(testDir);

    expect(fs.existsSync(path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md'))).toBe(false);
  });

  it('respects custom workflow selections and prunes deselected skill dirs', async () => {
    setMockConfig({
      featureFlags: {},
      profile: 'custom',
      workflows: ['explore', 'apply'],
    });
    await writeManagedSkill(testDir, '.claude', 'explore');
    await writeManagedSkill(testDir, '.claude', 'new');

    await new UpdateCommand().execute(testDir);

    expect(fs.existsSync(path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.claude', 'skills', 'openspec-new-change'))).toBe(false);
  });

  it('upgrades supported legacy tools with --force into linked skills', async () => {
    const legacyDir = path.join(testDir, '.claude', 'commands', 'openspec');
    await fsp.mkdir(legacyDir, { recursive: true });
    await fsp.writeFile(path.join(legacyDir, 'proposal.md'), '# legacy\n', 'utf-8');

    await new UpdateCommand({ force: true }).execute(testDir);

    const canonicalPropose = getCanonicalSkillFilePath(testDir, 'openspec-propose');
    const toolPropose = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
    expect(fs.existsSync(legacyDir)).toBe(false);
    expect(fs.existsSync(toolPropose)).toBe(true);
    expect(isManagedSkillLinkHealthySync(canonicalPropose, toolPropose)).toBe(true);
  });

  it('detects newly added supported tool directories', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    await writeManagedSkill(testDir, '.claude', 'explore');
    await fsp.mkdir(path.join(testDir, '.opencode'), { recursive: true });

    await new UpdateCommand().execute(testDir);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Detected new tool: OpenCode. Run 'openspec init' to add it.")
    );
  });

  it('scanInstalledWorkflows returns the workflow union for supported tools', async () => {
    await writeManagedSkill(testDir, '.claude', 'explore');
    await writeManagedSkill(testDir, '.opencode', 'apply');

    const workflows = scanInstalledWorkflows(testDir, ['claude', 'opencode']);

    expect(workflows).toContain('explore');
    expect(workflows).toContain('apply');
  });

  it('scanInstalledWorkflows still detects managed command files for migration', async () => {
    await writeLegacyCommand(testDir, 'explore');

    const workflows = scanInstalledWorkflows(testDir, ['claude']);

    expect(workflows).toEqual(['explore']);
  });
});
