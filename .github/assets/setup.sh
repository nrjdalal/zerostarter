# Sandbox for recording the ZeroStarter CLI demo GIF (zsh). Run vhs from the repo root:
#   bun run --cwd packages/cli build && vhs .github/assets/cli.tape
# Aliases `zerostarter` to the freshly built dist and runs in a throwaway HOME, so recordings never touch your real ~/.config or ~/.zshrc.
ZS_BIN="$PWD/packages/cli/dist/bin/index.mjs"
export BUN_INSTALL_CACHE_DIR="$HOME/.bun/install/cache"
export SB="/tmp/zerostarter"
# rename any prior sandbox aside (instant) so sourcing returns immediately and init runs uncontended; a synchronous rm of its node_modules would block the next typed command, a background rm would compete with init's install. the leftover sits in /tmp (cleared on reboot).
[ -e "$SB" ] && mv "$SB" "/tmp/zs-trash-$$"
mkdir -p "$SB/acme"
export HOME="$SB"
export XDG_CONFIG_HOME="$SB/.config"
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

zerostarter() { node "$ZS_BIN" "$@"; }

# Shadow `docker` with a non-zero stub so init's Docker detection is off during the
# recording (skips the local-database prompt); keeps the demo the same whether or not
# the recorder has Docker running, and never touches the real docker on PATH elsewhere.
mkdir -p "$SB/bin"
printf '#!/bin/sh\nexit 1\n' > "$SB/bin/docker"
chmod +x "$SB/bin/docker"
export PATH="$SB/bin:$PATH"

cd "$SB/acme"
autoload -Uz add-zsh-hook
# %1~ shows just the project dir (acme); reset color before each command's output
PROMPT=$'\n%F{cyan}%1~ ❯ '
__zs_demo_reset() { print -n $'\e[0m' }
add-zsh-hook preexec __zs_demo_reset
