# Supported Tools

OpenSpec now installs workflow support as skills only. There is no generated `opsx-*` command surface anymore.

## Supported Tool IDs

- `claude`
- `codex`
- `github-copilot`
- `opencode`

Use them with `openspec init --tools <id,id,...>` or `openspec init --tools all`.

## Install Layout

OpenSpec writes one canonical copy of each selected workflow skill under:

```text
openspec/skills/<skill-dir>/SKILL.md
```

For each selected tool, OpenSpec creates a link to that canonical file at:

| Tool | Skill path pattern |
|------|--------------------|
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` |
| Codex (`codex`) | `.codex/skills/openspec-*/SKILL.md` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` |

OpenSpec prefers relative symlinks. If symlinks are unavailable, it falls back to file hardlinks. If neither is possible, `init`/`update` fails instead of copying duplicate skill content.

## Workflow Selection

The default `core` profile installs:

- `propose`
- `explore`
- `apply`
- `archive`

Custom selections are managed with `openspec config profile`, then applied to a project with `openspec update`.

## Generated Skill Names

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

## Related

- [CLI Reference](cli.md)
- [Getting Started](getting-started.md)
