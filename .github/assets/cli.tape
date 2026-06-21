# zerostarter init: scaffold a fresh, rebranded product from the starter.
# Render from the repo root: bun run --cwd packages/cli build && vhs .github/assets/cli.tape
Output .github/assets/cli.gif

Require node

Set Shell zsh
Set FontSize 18
Set FontFamily "Berkeley Mono"
Set Width 1280
Set Height 480
Set Padding 22
Set Theme { "name": "GitHub Dark", "background": "#101216", "foreground": "#e6edf3", "black": "#000000", "red": "#f78166", "green": "#56d364", "yellow": "#e3b341", "blue": "#6ca4f8", "magenta": "#db61a2", "cyan": "#39c5cf", "white": "#ffffff", "brightBlack": "#4d4d4d", "brightRed": "#f78166", "brightGreen": "#56d364", "brightYellow": "#e3b341", "brightBlue": "#6ca4f8", "brightMagenta": "#db61a2", "brightCyan": "#56d4dd", "brightWhite": "#ffffff", "cursor": "#c9d1d9", "selection": "#3b5070" }
Set TypingSpeed 55ms

Hide
Type "source .github/assets/setup.sh" Enter
Type "clear" Enter
Show

Sleep 800ms
Type "zerostarter init" Sleep 300ms Enter
Sleep 20s
