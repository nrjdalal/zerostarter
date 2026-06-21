# Sandbox for recording the ZeroStarter CLI demo GIF (zsh). Run vhs from the repo root:
#   bun run --cwd packages/cli build && vhs .github/assets/cli.tape
# Aliases `zerostarter` to the freshly built dist and drops you in a throwaway dir, so recordings use your local build and never touch a real project.
export SB="/tmp/zerostarter"
rm -rf "$SB"
mkdir -p "$SB/acme"

ZS_BIN="$PWD/packages/cli/dist/bin/index.mjs"
zerostarter() { node "$ZS_BIN" "$@"; }

cd "$SB/acme"
autoload -Uz add-zsh-hook
# blank line before the prompt; %1~ shows just the project dir (acme), not the /tmp path; prompt renders cyan, reset to default before each command's output
PROMPT=$'\n%F{cyan}%1~ ❯ '
__zs_demo_reset() { print -n $'\e[0m' }
add-zsh-hook preexec __zs_demo_reset
