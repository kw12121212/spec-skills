# Getting Started

OpenSpec now installs workflow support as skills. The CLI writes one canonical copy under `openspec/skills/` and links each selected tool to those skill files.

## 1. Initialize a Project

```bash
openspec init --tools claude
```

Supported tool IDs:

- `claude`
- `codex`
- `github-copilot`
- `opencode`

Use `--tools all` to install every supported tool, or `--tools none` to create only the OpenSpec project structure.

## 2. Default Workflow

The default `core` profile installs four skills:

- `openspec-propose`
- `openspec-explore`
- `openspec-apply-change`
- `openspec-archive-change`

Typical flow:

```text
openspec-propose -> openspec-apply-change -> openspec-archive-change
```

## 3. Expanded Workflow

If you want step-by-step artifact creation, switch to a custom workflow profile and then sync the project:

```bash
openspec config profile
openspec update
```

Additional skills available in custom profiles:

- `openspec-new-change`
- `openspec-continue-change`
- `openspec-ff-change`
- `openspec-verify-change`
- `openspec-sync-specs`
- `openspec-bulk-archive-change`
- `openspec-onboard`

Expanded flow:

```text
openspec-new-change -> openspec-continue-change / openspec-ff-change -> openspec-apply-change -> openspec-verify-change -> openspec-archive-change
```

## 4. Update After Profile Changes

Changing global workflow selection does not rewrite existing projects automatically. Run:

```bash
openspec update
```

That will regenerate canonical skills and refresh the tool-local links for the current project.

## 5. Generated Layout

```text
openspec/
├── changes/
├── specs/
├── skills/
│   └── openspec-*/SKILL.md
└── config.yaml

.claude/skills/openspec-*/SKILL.md
.codex/skills/openspec-*/SKILL.md
.github/skills/openspec-*/SKILL.md
.opencode/skills/openspec-*/SKILL.md
```

## Related

- [CLI Reference](cli.md)
- [Supported Tools](supported-tools.md)
- [Skill Reference](commands.md)
