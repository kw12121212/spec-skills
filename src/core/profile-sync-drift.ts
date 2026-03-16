import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from './config.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { getConfiguredTools } from './shared/index.js';
import { getCanonicalSkillFilePath, isManagedSkillLinkHealthySync } from './skill-links.js';

type WorkflowId = (typeof ALL_WORKFLOWS)[number];

/**
 * Maps workflow IDs to their skill directory names.
 */
export const WORKFLOW_TO_SKILL_DIR: Record<WorkflowId, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

function toKnownWorkflows(workflows: readonly string[]): WorkflowId[] {
  return workflows.filter(
    (workflow): workflow is WorkflowId =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
  );
}

export function getConfiguredToolsForProfileSync(projectPath: string): string[] {
  return getConfiguredTools(projectPath);
}

/**
 * Detects if a single tool has workflow drift against the desired state.
 *
 * This function covers:
 * - required artifacts missing for selected workflows
 * - artifacts for workflows that were deselected from the current profile
 */
export function hasToolProfileOrDeliveryDrift(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[],
): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return false;

  const knownDesiredWorkflows = toKnownWorkflows(desiredWorkflows);
  const desiredWorkflowSet = new Set<WorkflowId>(knownDesiredWorkflows);
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  for (const workflow of knownDesiredWorkflows) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    const sourceFile = getCanonicalSkillFilePath(projectPath, dirName);
    if (!fs.existsSync(skillFile)) {
      return true;
    }
    if (!fs.existsSync(sourceFile)) {
      return true;
    }
    if (!fs.statSync(skillFile).isFile()) {
      return true;
    }
    if (!fs.statSync(sourceFile).isFile()) {
      return true;
    }
    if (!isManagedSkillLinkHealthySync(sourceFile, skillFile)) {
      return true;
    }
  }

  for (const workflow of ALL_WORKFLOWS) {
    if (desiredWorkflowSet.has(workflow)) continue;
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillDir = path.join(skillsDir, dirName);
    if (fs.existsSync(skillDir)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns configured tools that currently need a workflow sync.
 */
export function getToolsNeedingProfileSync(
  projectPath: string,
  desiredWorkflows: readonly string[],
  configuredTools?: readonly string[]
): string[] {
  const tools = configuredTools ? [...new Set(configuredTools)] : getConfiguredToolsForProfileSync(projectPath);
  return tools.filter((toolId) =>
    hasToolProfileOrDeliveryDrift(projectPath, toolId, desiredWorkflows)
  );
}

function getInstalledWorkflowsForTool(
  projectPath: string,
  toolId: string,
): WorkflowId[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) return [];

  const installed = new Set<WorkflowId>();
  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    const sourceFile = getCanonicalSkillFilePath(projectPath, dirName);
    if (!fs.existsSync(skillFile) || !fs.existsSync(sourceFile)) {
      continue;
    }
    installed.add(workflow);
    if (!isManagedSkillLinkHealthySync(sourceFile, skillFile)) {
      return [...installed];
    }
  }

  return [...installed];
}

/**
 * Detects whether the current project has any profile drift.
 */
export function hasProjectConfigDrift(
  projectPath: string,
  desiredWorkflows: readonly string[],
): boolean {
  const configuredTools = getConfiguredToolsForProfileSync(projectPath);
  if (getToolsNeedingProfileSync(projectPath, desiredWorkflows, configuredTools).length > 0) {
    return true;
  }

  const desiredSet = new Set(toKnownWorkflows(desiredWorkflows));
  for (const toolId of configuredTools) {
    const installed = getInstalledWorkflowsForTool(projectPath, toolId);
    if (installed.some((workflow) => !desiredSet.has(workflow))) {
      return true;
    }
  }

  return false;
}
