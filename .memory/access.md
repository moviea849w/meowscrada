# Access & credentials

Where the keys live and how to use them. **Never commit a token** — these files are
outside the repo, or gitignored.

## GitHub token (to trigger CI)

| | |
|---|---|
| What | GitHub **classic** PAT, repo-level control (`repo` scope + `workflow`) |
| Where | `~/.config/meowscrada/env`, line `GH_TOKEN=ghp_…` |
| Owner | `moviea849w` (admin on `moviea849w/meowscrada`) |
| Created | 2026-11-06 |

The token in the Codespace environment (`GITHUB_TOKEN`, `ghu_…`) is the Codespaces
integration token. It **cannot dispatch workflows** (`403 Resource not accessible by
integration`) and **cannot push workflow files**. Always use `GH_TOKEN` for CI work.

### Use it

```bash
# load it into this shell
export GH_TOKEN="$(grep '^GH_TOKEN=' ~/.config/meowscrada/env | cut -d= -f2)"

gh auth status                      # shows the PAT and its scopes
gh workflow run render.yml -f episode=004-earth-stop
gh run list --limit 5
gh run watch <run-id> --exit-status
gh run view <run-id> --log-failed
```

`gh` prefers `GH_TOKEN` over `GITHUB_TOKEN`, so the `export` above is all that is
needed. Do not pass the token on a command line that gets logged.

### If it is rotated or lost

Ask the user for a new classic PAT with `repo` + `workflow`. Replace the `GH_TOKEN=`
line in `~/.config/meowscrada/env` (keep the file at mode 600), then
`export GH_TOKEN=...` again. Never write it into `.memory/` or any committed file.

## Other keys in `~/.config/meowscrada/env`

| Key | Used by | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `scripts/telegram-send.sh`, CI secrets | bot from @BotFather |
| `TELEGRAM_CHAT_ID` | same | group ids start with `-` |
| `PEXELS_API_KEY` | `scripts/stock-fetch.sh` | also a CI secret |

CI reads `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `PEXELS_API_KEY` from
**repo secrets**, not from this file. `GH_TOKEN` is only for driving CI from here.

## GitHub CI facts

- Workflows: `.github/workflows/render.yml` (episode pipeline) and
  `gl-probe.yml` (3D feasibility probe).
- Runner: `ubuntu-latest`, 4 cores, 15 GB, no GPU — but a real software-GL stack.
- The Remotion/three.js project is mirrored at `workspaces/remotion-studio/` in the
  repo so a runner can build it; `node_modules` is excluded by its `.gitignore`.
