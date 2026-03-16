import { describe, expect, it } from 'vitest';

import {
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxProposeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';

describe('skill templates facade', () => {
  it('exports the supported skill template factories', () => {
    const templates = [
      getExploreSkillTemplate(),
      getNewChangeSkillTemplate(),
      getContinueChangeSkillTemplate(),
      getApplyChangeSkillTemplate(),
      getFfChangeSkillTemplate(),
      getSyncSpecsSkillTemplate(),
      getArchiveChangeSkillTemplate(),
      getBulkArchiveChangeSkillTemplate(),
      getVerifyChangeSkillTemplate(),
      getOnboardSkillTemplate(),
      getOpsxProposeSkillTemplate(),
      getFeedbackSkillTemplate(),
    ];

    expect(templates.every((template) => template.name && template.description)).toBe(true);
  });

  it('generates skill files with frontmatter for shipped workflow skills', () => {
    const skillFactories = [
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getVerifyChangeSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxProposeSkillTemplate,
    ];

    for (const createTemplate of skillFactories) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');
      expect(content.startsWith('---\n')).toBe(true);
      expect(content).toContain('generatedBy: "PARITY-BASELINE"');
    }
  });
});
