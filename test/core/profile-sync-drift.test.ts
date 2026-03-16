import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  hasProjectConfigDrift,
  WORKFLOW_TO_SKILL_DIR,
} from '../../src/core/profile-sync-drift.js';
import { CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { getCanonicalSkillFilePath } from '../../src/core/skill-links.js';

function writeSkill(projectDir: string, workflowId: string): void {
  const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId as keyof typeof WORKFLOW_TO_SKILL_DIR];
  const sourcePath = getCanonicalSkillFilePath(projectDir, skillDirName);
  const skillPath = path.join(projectDir, '.claude', 'skills', skillDirName, 'SKILL.md');
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, `name: ${skillDirName}\n`);
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.linkSync(sourcePath, skillPath);
}

function setupCoreSkills(projectDir: string): void {
  for (const workflow of CORE_WORKFLOWS) {
    writeSkill(projectDir, workflow);
  }
}

describe('profile sync drift detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-profile-sync-drift-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects drift when required profile workflow files are missing', () => {
    writeSkill(tempDir, 'explore');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS);
    expect(hasDrift).toBe(true);
  });

  it('returns false when project files match the core workflow profile', () => {
    setupCoreSkills(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS);
    expect(hasDrift).toBe(false);
  });

  it('detects drift when extra workflows are installed', () => {
    setupCoreSkills(tempDir);
    writeSkill(tempDir, 'sync');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS);
    expect(hasDrift).toBe(true);
  });

  it('detects drift when a tool skill file is a copied file instead of a managed link', () => {
    const workflowId = 'explore';
    const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId];
    const sourcePath = getCanonicalSkillFilePath(tempDir, skillDirName);
    const skillPath = path.join(tempDir, '.claude', 'skills', skillDirName, 'SKILL.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, 'name: openspec-explore\n');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, 'name: openspec-explore\n');

    const hasDrift = hasProjectConfigDrift(tempDir, [workflowId]);
    expect(hasDrift).toBe(true);
  });
});
