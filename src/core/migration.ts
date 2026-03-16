/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects when profile system is introduced.
 * Called by both init and update commands before profile resolution.
 */

import type { AIToolOption } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig } from './global-config.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { ALL_WORKFLOWS } from './profiles.js';
import os from 'os';
import path from 'path';
import * as fs from 'fs';

interface InstalledWorkflowArtifacts {
  workflows: string[];
  hasSkills: boolean;
}

function scanInstalledWorkflowArtifacts(
  projectPath: string,
  tools: AIToolOption[]
): InstalledWorkflowArtifacts {
  const installed = new Set<string>();
  let hasSkills = false;

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const workflowId of ALL_WORKFLOWS) {
      const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
        hasSkills = true;
      }
    }

    for (const workflowId of ALL_WORKFLOWS) {
      if (findManagedCommandPathsForTool(projectPath, tool.value, workflowId).some((commandPath) => fs.existsSync(commandPath))) {
        installed.add(workflowId);
      }
    }
  }

  return {
    workflows: ALL_WORKFLOWS.filter((workflowId) => installed.has(workflowId)),
    hasSkills,
  };
}

/**
 * Scans installed workflow files across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  return scanInstalledWorkflowArtifacts(projectPath, tools).workflows;
}

/**
 * Performs one-time migration if the global config does not yet have a profile field.
 * Called by both init and update before profile resolution.
 *
 * - If no profile field exists and workflows are installed: sets profile to 'custom'
 *   with the detected workflows, preserving the user's existing setup.
 * - If no profile field exists and no workflows are installed: no-op (defaults apply).
 * - If profile field already exists: no-op.
 */
export function migrateIfNeeded(projectPath: string, tools: AIToolOption[]): void {
  const config = getGlobalConfig();

  // Check raw config file for profile field presence
  const configPath = getGlobalConfigPath();

  let rawConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    return; // Can't read config, skip migration
  }

  // If profile is already explicitly set, no migration needed
  if (rawConfig.profile !== undefined) {
    return;
  }

  // Scan for installed workflows
  const artifacts = scanInstalledWorkflowArtifacts(projectPath, tools);
  const installedWorkflows = artifacts.workflows;

  if (installedWorkflows.length === 0) {
    // No workflows installed, new user — defaults will apply
    return;
  }

  // Migrate: set profile to custom with detected workflows
  config.profile = 'custom';
  config.workflows = installedWorkflows;
  saveGlobalConfig(config);

  console.log(`Migrated: custom profile with ${installedWorkflows.length} workflows`);
  console.log("Try 'openspec config profile core' for the streamlined experience.");
}

function findManagedCommandPathsForTool(projectPath: string, toolId: string, workflowId: string): string[] {
  const codexHome = path.resolve(process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex'));
  const commandPathsByTool: Record<string, string[]> = {
    claude: [path.join(projectPath, '.claude', 'commands', 'opsx', `${workflowId}.md`)],
    opencode: [
      path.join(projectPath, '.opencode', 'commands', `opsx-${workflowId}.md`),
      path.join(projectPath, '.opencode', 'command', `opsx-${workflowId}.md`),
    ],
    'github-copilot': [path.join(projectPath, '.github', 'prompts', `opsx-${workflowId}.prompt.md`)],
    codex: [path.join(codexHome, 'prompts', `opsx-${workflowId}.md`)],
  };

  return commandPathsByTool[toolId] ?? [];
}
