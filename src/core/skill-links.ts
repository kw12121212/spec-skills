import path from 'path';
import { promises as fs } from 'fs';
import * as syncFs from 'fs';

export const CANONICAL_SKILLS_DIR = path.join('openspec', 'skills');

export function getCanonicalSkillsDir(projectPath: string): string {
  return path.join(projectPath, CANONICAL_SKILLS_DIR);
}

export function getCanonicalSkillFilePath(projectPath: string, skillDirName: string): string {
  return path.join(getCanonicalSkillsDir(projectPath), skillDirName, 'SKILL.md');
}

export async function installSkillLink(sourceFile: string, destinationFile: string): Promise<'symlink' | 'hardlink'> {
  await fs.mkdir(path.dirname(destinationFile), { recursive: true });
  await fs.rm(destinationFile, { force: true });

  const relativeSource = path.relative(path.dirname(destinationFile), sourceFile);

  try {
    await fs.symlink(relativeSource, destinationFile, 'file');
    return 'symlink';
  } catch (symlinkError) {
    try {
      await fs.link(sourceFile, destinationFile);
      return 'hardlink';
    } catch (hardlinkError) {
      const message = [
        `Unable to install skill link at ${destinationFile}.`,
        `Symlink failed: ${formatLinkError(symlinkError)}`,
        `Hardlink failed: ${formatLinkError(hardlinkError)}`,
      ].join(' ');
      throw new Error(message);
    }
  }
}

export async function isManagedSkillLinkHealthy(sourceFile: string, destinationFile: string): Promise<boolean> {
  return isManagedSkillLinkHealthySync(sourceFile, destinationFile);
}

export function isManagedSkillLinkHealthySync(sourceFile: string, destinationFile: string): boolean {
  try {
    const destinationStats = syncFs.lstatSync(destinationFile);

    if (destinationStats.isSymbolicLink()) {
      const linkTarget = syncFs.readlinkSync(destinationFile);
      return path.resolve(path.dirname(destinationFile), linkTarget) === sourceFile;
    }

    const sourceStats = syncFs.statSync(sourceFile);
    const targetStats = syncFs.statSync(destinationFile);

    return sourceStats.dev === targetStats.dev && sourceStats.ino === targetStats.ino;
  } catch {
    return false;
  }
}

function formatLinkError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
