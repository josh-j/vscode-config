# VS Code configuration

My user settings and Helix-style keybindings for VS Code. The JSON files are meant for a **user profile**, not a project's `.vscode/` directory.

## Setup

1. Install [VS Code](https://code.visualstudio.com/) and the required extensions below.
2. In the Command Palette, run **Preferences: Open User Settings (JSON)** and merge [`settings.json`](settings.json) into your user settings. Back up any existing settings first.
3. Run **Preferences: Open Keyboard Shortcuts (JSON)** and merge [`keybindings.json`](keybindings.json) into your user keybindings. These shortcuts replace several VS Code defaults, so review conflicts if you already have custom bindings.
4. Reload the VS Code window.

VS Code stores these files in `%APPDATA%\Code\User\` on Windows, `~/Library/Application Support/Code/User/` on macOS, and `~/.config/Code/User/` on Linux. The keybindings favor a PC keyboard; macOS users may need to adjust modifier keys.

## Extensions and tools

| Use | Install | Why |
| --- | --- | --- |
| Required for the modal keymap | [Dance](https://marketplace.visualstudio.com/items?itemName=gregoire.dance) (`gregoire.dance`) | Provides the `dance.*` modes and commands used throughout both files. |
| Required for the Helix layout | [Dance - Helix keybindings](https://marketplace.visualstudio.com/items?itemName=gregoire.dance-helix) (`gregoire.dance-helix`) | Provides the `helix/normal`, `helix/insert`, and `helix/select` modes selected by the settings. |
| Required for the buffer and pane actions | [Helix Workbench](extensions/helix-workbench/README.md) (`sio.helix-workbench`) | Provides the `sio.*` commands used by the keybindings and Dance menus. Build it from the source in this repo. |
| Recommended for Nix files | [Nix IDE](https://marketplace.visualstudio.com/items?itemName=jnoortheen.nix-ide) (`jnoortheen.nix-ide`) | Supplies the configured Nix formatter and language support. Install `nixd` and `alejandra` on your `PATH` for the configured language server and formatting. |
| Recommended for shell scripts | [shell-format](https://marketplace.visualstudio.com/items?itemName=foxundermoon.shell-format) (`foxundermoon.shell-format`) | Supplies the configured shell formatter. Install `shfmt` on your `PATH`, or set `shellformat.path` locally. |

Install the marketplace extensions with:

```sh
code --install-extension gregoire.dance
code --install-extension gregoire.dance-helix
code --install-extension jnoortheen.nix-ide
code --install-extension foxundermoon.shell-format
```

Build and install Helix Workbench from this checkout:

```sh
python3 extensions/helix-workbench/package.py helix-workbench.vsix
code --install-extension helix-workbench.vsix
```

Reload VS Code after installation. On Windows, use `python` if `python3` is not available. The extension has no runtime dependencies; see its [README](extensions/helix-workbench/README.md) for the buffer and pane commands. If you skip it, remove the `sio.*` bindings, Dance menu entries, and `terminal.integrated.commandsToSkipShell` entries because those actions will not work.

The configured editor and terminal font is **JetBrains Mono**. Install that font for the same appearance, or change the two font settings to one you already have.
