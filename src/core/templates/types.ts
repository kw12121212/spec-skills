/**
 * Core template types for generated skill content.
 */

export interface SkillTemplate {
  name: string;
  description: string;
  instructions: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

/**
 * Legacy command template shape kept for compatibility with internal modules
 * that still define deprecated command templates.
 */
export interface CommandTemplate {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}
