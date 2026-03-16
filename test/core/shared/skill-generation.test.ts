import { describe, it, expect } from 'vitest';
import {
  getSkillTemplates,
  generateSkillContent,
} from '../../../src/core/shared/skill-generation.js';

describe('skill-generation', () => {
  describe('getSkillTemplates', () => {
    it('returns all 11 skill templates', () => {
      const templates = getSkillTemplates();
      expect(templates).toHaveLength(11);
    });

    it('has unique directory names and workflow IDs', () => {
      const templates = getSkillTemplates();
      expect(new Set(templates.map((t) => t.dirName)).size).toBe(templates.length);
      expect(new Set(templates.map((t) => t.workflowId)).size).toBe(templates.length);
    });

    it('includes the expected skill directory names', () => {
      const dirNames = getSkillTemplates().map((t) => t.dirName);

      expect(dirNames).toEqual(expect.arrayContaining([
        'openspec-explore',
        'openspec-new-change',
        'openspec-continue-change',
        'openspec-apply-change',
        'openspec-ff-change',
        'openspec-sync-specs',
        'openspec-archive-change',
        'openspec-bulk-archive-change',
        'openspec-verify-change',
        'openspec-onboard',
        'openspec-propose',
      ]));
    });

    it('filters by workflow IDs when provided', () => {
      const filtered = getSkillTemplates(['propose', 'explore', 'apply', 'archive']);
      expect(filtered.map((t) => t.workflowId)).toEqual(['explore', 'apply', 'archive', 'propose']);
    });

    it('returns an empty array when the filter matches nothing', () => {
      expect(getSkillTemplates(['nonexistent'])).toEqual([]);
    });
  });

  describe('generateSkillContent', () => {
    it('generates valid YAML frontmatter', () => {
      const content = generateSkillContent(
        {
          name: 'test-skill',
          description: 'Test description',
          instructions: 'Test instructions',
          license: 'MIT',
          compatibility: 'Test compatibility',
          metadata: {
            author: 'test-author',
            version: '2.0',
          },
        },
        '0.23.0'
      );

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: test-skill');
      expect(content).toContain('description: Test description');
      expect(content).toContain('license: MIT');
      expect(content).toContain('compatibility: Test compatibility');
      expect(content).toContain('author: test-author');
      expect(content).toContain('version: "2.0"');
      expect(content).toContain('generatedBy: "0.23.0"');
      expect(content).toContain('Test instructions');
    });

    it('uses default values for optional fields', () => {
      const content = generateSkillContent(
        {
          name: 'minimal-skill',
          description: 'Minimal description',
          instructions: 'Minimal instructions',
        },
        '0.24.0'
      );

      expect(content).toContain('license: MIT');
      expect(content).toContain('compatibility: Requires openspec CLI.');
      expect(content).toContain('author: openspec');
      expect(content).toContain('version: "1.0"');
      expect(content).toContain('generatedBy: "0.24.0"');
    });

    it('ends frontmatter with a blank line before the body', () => {
      const content = generateSkillContent(
        {
          name: 'test',
          description: 'Test',
          instructions: 'Body content',
        },
        '0.23.0'
      );

      expect(content).toMatch(/---\n\nBody content\n$/);
    });

    it('applies the optional instruction transformer', () => {
      const content = generateSkillContent(
        {
          name: 'transform-test',
          description: 'Test transform callback',
          instructions: 'Use OLD wording here.',
        },
        '0.23.0',
        (text) => text.replace('OLD', 'NEW')
      );

      expect(content).toContain('Use NEW wording here.');
      expect(content).not.toContain('Use OLD wording here.');
    });

    it('leaves instructions unchanged when no transformer is provided', () => {
      const content = generateSkillContent(
        {
          name: 'no-transform-test',
          description: 'Test without transform',
          instructions: 'Keep this wording.',
        },
        '0.23.0'
      );

      expect(content).toContain('Keep this wording.');
    });
  });
});
