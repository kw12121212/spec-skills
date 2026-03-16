/**
 * Agent Skill Templates
 *
 * Compatibility facade that re-exports split workflow skill templates.
 */

export type { SkillTemplate } from './types.js';

export { getExploreSkillTemplate } from './workflows/explore.js';
export { getNewChangeSkillTemplate } from './workflows/new-change.js';
export { getContinueChangeSkillTemplate } from './workflows/continue-change.js';
export { getApplyChangeSkillTemplate } from './workflows/apply-change.js';
export { getFfChangeSkillTemplate } from './workflows/ff-change.js';
export { getSyncSpecsSkillTemplate } from './workflows/sync-specs.js';
export { getArchiveChangeSkillTemplate } from './workflows/archive-change.js';
export { getBulkArchiveChangeSkillTemplate } from './workflows/bulk-archive-change.js';
export { getVerifyChangeSkillTemplate } from './workflows/verify-change.js';
export { getOnboardSkillTemplate } from './workflows/onboard.js';
export { getOpsxProposeSkillTemplate } from './workflows/propose.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';
