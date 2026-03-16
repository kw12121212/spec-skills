# Workflows

OpenSpec supports two workflow styles, both delivered as skills.

## Core Workflow

Installed by default:

- `openspec-propose`
- `openspec-explore`
- `openspec-apply-change`
- `openspec-archive-change`

Recommended path:

```text
openspec-propose -> openspec-apply-change -> openspec-archive-change
```

Use `openspec-explore` whenever requirements are unclear or you want to think through tradeoffs before creating or updating a change.

## Expanded Workflow

Available through custom workflow selection:

- `openspec-new-change`
- `openspec-continue-change`
- `openspec-ff-change`
- `openspec-verify-change`
- `openspec-sync-specs`
- `openspec-bulk-archive-change`
- `openspec-onboard`

Recommended path:

```text
openspec-new-change -> openspec-continue-change / openspec-ff-change -> openspec-apply-change -> openspec-verify-change -> openspec-archive-change
```

## When to Use Which

Use `openspec-propose` when you already understand the scope well enough to generate planning artifacts in one pass.

Use `openspec-new-change` plus `openspec-continue-change` when you want explicit control over artifact creation order.

Use `openspec-ff-change` when the work is straightforward and you want planning artifacts generated quickly.

Use `openspec-verify-change` before archiving if you want an explicit implementation review against tasks, specs, and design.

Use `openspec-sync-specs` when delta specs need to be merged into main specs before archiving.

## Profile Changes

Workflow availability is controlled globally:

```bash
openspec config profile
```

Then apply that selection to a project:

```bash
openspec update
```

## Related

- [Getting Started](getting-started.md)
- [Skill Reference](commands.md)
- [CLI Reference](cli.md)
