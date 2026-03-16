# Skill Reference

OpenSpec workflow execution is installed as skills. The CLI generates canonical skills under `openspec/skills/` and links them into the selected tool's `skills/` directory.

## Core Skills

| Skill | Purpose |
|-------|---------|
| `openspec-propose` | Create a change and generate planning artifacts in one pass |
| `openspec-explore` | Think through ideas before committing to a change |
| `openspec-apply-change` | Implement tasks from the active change |
| `openspec-archive-change` | Archive a completed change |

## Expanded Skills

| Skill | Purpose |
|-------|---------|
| `openspec-new-change` | Start a change scaffold |
| `openspec-continue-change` | Create the next artifact in sequence |
| `openspec-ff-change` | Fast-forward planning artifacts |
| `openspec-verify-change` | Verify implementation against artifacts |
| `openspec-sync-specs` | Sync delta specs into main specs |
| `openspec-bulk-archive-change` | Archive multiple completed changes |
| `openspec-onboard` | Guided end-to-end onboarding flow |

## Typical Flow

Default `core` profile:

```text
openspec-propose -> openspec-apply-change -> openspec-archive-change
```

Expanded profile:

```text
openspec-new-change -> openspec-continue-change / openspec-ff-change -> openspec-apply-change -> openspec-verify-change -> openspec-archive-change
```

## Notes

- The `core` profile installs `propose`, `explore`, `apply`, and `archive`.
- `openspec config profile` controls which skills are available globally.
- Run `openspec update` inside a project after changing your profile.

## Related

- [CLI Reference](cli.md)
- [Supported Tools](supported-tools.md)
- [Getting Started](getting-started.md)
