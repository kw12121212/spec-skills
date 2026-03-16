import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/commands/config.js');
  const program = new Command();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

async function getPromptMocks(): Promise<{
  select: ReturnType<typeof vi.fn>;
  checkbox: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    select: prompts.select as unknown as ReturnType<typeof vi.fn>,
    checkbox: prompts.checkbox as unknown as ReturnType<typeof vi.fn>,
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('config profile', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalTTY: boolean | undefined;
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();

    tempDir = path.join(os.tmpdir(), `openspec-config-profile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalTTY = (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    process.chdir(tempDir);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = originalTTY;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('diffProfileState uses explicit removed wording when workflows are deleted', async () => {
    const { diffProfileState } = await import('../../src/commands/config.js');

    const diff = diffProfileState(
      { profile: 'custom', workflows: ['propose', 'sync'] },
      { profile: 'custom', workflows: ['propose'] },
    );

    expect(diff).toEqual({
      hasChanges: true,
      lines: ['workflows: removed sync'],
    });
  });

  it('deriveProfileFromWorkflowSelection returns core only for the exact core set', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');

    expect(deriveProfileFromWorkflowSelection(['archive', 'apply', 'explore', 'propose'])).toBe('core');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore'])).toBe('custom');
  });

  it('interactive flow only offers workflow configuration and keep', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', workflows: ['propose', 'explore', 'apply', 'archive'] });
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const firstCall = select.mock.calls[0][0];
    expect(firstCall.message).toBe('What do you want to configure?');
    expect(firstCall.choices).toEqual([
      expect.objectContaining({
        value: 'workflows',
        name: 'Workflows only',
        description: 'Change which workflow actions are available',
      }),
      expect.objectContaining({
        value: 'keep',
        name: 'Keep current settings (exit)',
      }),
    ]);
  });

  it('workflow picker updates config and prompts to apply inside an openspec project', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', workflows: ['propose', 'explore', 'apply', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore']);
    confirm.mockResolvedValueOnce(false);

    await runConfigCommand(['profile']);

    expect(checkbox).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith({
      message: 'Apply changes to this project now?',
      default: true,
    });
    expect(getGlobalConfig()).toEqual({
      featureFlags: {},
      profile: 'custom',
      workflows: ['propose', 'explore'],
    });
  });

  it('keep action warns when project files drift from the global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', workflows: ['propose', 'explore', 'apply', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    const exploreSkill = path.join(tempDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    fs.mkdirSync(path.dirname(exploreSkill), { recursive: true });
    fs.writeFileSync(exploreSkill, 'stale copy');
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('core preset rewrites the config without any prompts', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', workflows: ['explore'] });

    await runConfigCommand(['profile', 'core']);

    expect(getGlobalConfig()).toEqual({
      featureFlags: {},
      profile: 'core',
      workflows: ['propose', 'explore', 'apply', 'archive'],
    });
    expect(select).not.toHaveBeenCalled();
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('Ctrl+C cancels cleanly with exit code 130', async () => {
    const { select } = await getPromptMocks();
    const cancellationError = new Error('User force closed the prompt with SIGINT');
    cancellationError.name = 'ExitPromptError';
    select.mockRejectedValueOnce(cancellationError);

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('Config profile cancelled.');
    expect(process.exitCode).toBe(130);
  });
});
