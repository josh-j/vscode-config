# VS Code configuration

My user settings and Helix-style keybindings for VS Code. The JSON files are meant for a **user profile**, not a project's `.vscode/` directory.

## Setup

1. Install [VS Code](https://code.visualstudio.com/), then clone or download this repository and install the required extensions below.
2. In the Command Palette, run **Preferences: Open User Settings (JSON)** and merge [`settings.json`](settings.json) into your user settings. Back up any existing settings first.
3. Run **Preferences: Open Keyboard Shortcuts (JSON)** and merge [`keybindings.json`](keybindings.json) into your user keybindings. These shortcuts replace several VS Code defaults, so review conflicts if you already have custom bindings.
4. Reload the VS Code window.

VS Code stores these files in `%APPDATA%\Code\User\` on Windows, `~/Library/Application Support/Code/User/` on macOS, and `~/.config/Code/User/` on Linux. The keybindings favor a PC keyboard; macOS users may need to adjust modifier keys.

## Extensions and tools

| Use | Install | Why |
| --- | --- | --- |
| Required for the modal keymap | [Dance](https://marketplace.visualstudio.com/items?itemName=gregoire.dance) (`gregoire.dance`) | Provides the `dance.*` modes and commands used throughout both files. |
| Required for the Helix layout | [Dance - Helix keybindings](https://marketplace.visualstudio.com/items?itemName=gregoire.dance-helix) (`gregoire.dance-helix`) | Provides the `helix/normal`, `helix/insert`, and `helix/select` modes selected by the settings. |
| Required for the buffer and pane actions | [Helix Workbench](extensions/helix-workbench/README.md) (`sio.helix-workbench`) | Provides the `sio.*` commands used by the keybindings and Dance menus. Install the included [VSIX](extensions/helix-workbench/helix-workbench-0.3.0.vsix). |
| Recommended for Nix files | [Nix IDE](https://marketplace.visualstudio.com/items?itemName=jnoortheen.nix-ide) (`jnoortheen.nix-ide`) | Supplies the configured Nix formatter and language support. Install `nixd` and `alejandra` on your `PATH` for the configured language server and formatting. |
| Recommended for shell scripts | [shell-format](https://marketplace.visualstudio.com/items?itemName=foxundermoon.shell-format) (`foxundermoon.shell-format`) | Supplies the configured shell formatter. Install `shfmt` on your `PATH`, or set `shellformat.path` locally. |

Install the marketplace extensions with:

```sh
code --install-extension gregoire.dance
code --install-extension gregoire.dance-helix
code --install-extension jnoortheen.nix-ide
code --install-extension foxundermoon.shell-format
```

Install the included Helix Workbench VSIX from this checkout:

```sh
code --install-extension extensions/helix-workbench/helix-workbench-0.3.0.vsix
```

Reload VS Code after installation. The extension has no runtime dependencies; see its [README](extensions/helix-workbench/README.md) for the buffer and pane commands and source build instructions. If you skip it, remove the `sio.*` bindings, Dance menu entries, and `terminal.integrated.commandsToSkipShell` entries because those actions will not work.

The configured editor and terminal font is **DMMono Nerd Font Mono**, at 16 px. Install that font for the same appearance, or change the font settings to one you already have.

## Appearance and startup

The profile selects **NoctaliaTheme**, provided by [Noctalia's VS Code theme](https://github.com/tuibird/noctalia-vscode-theme) (`noctalia.noctaliatheme`). Install it with `code --install-extension noctalia.noctaliatheme`, or select another theme locally. The previous color and token overrides have been removed so the selected theme can control the palette. Dynamic Noctalia color updates require the theme's Noctalia/Matugen integration on your own machine.

Empty windows start on the Helix dashboard; opening a project shows its files. The profile disables window/editor restoration, terminal persistence, and Hot Exit, so it starts fresh rather than restoring the previous session. Change those settings locally if you prefer session restoration.

`Ctrl+W T` opens a terminal buffer when focus is outside the terminal. `Ctrl+W Q` closes a split pane or the active non-text editor when focus is outside the terminal. The final text pane stays open.

Terminals pass keyboard shortcuts to the shell, disable VS Code chords, and leave Alt keys available for Emacs-style input. In a shell using an Emacs keymap, `Ctrl+A/E` move to the beginning/end of the line, `Ctrl+B/F` move by character, `Alt+B/F` move by word, `Ctrl+W` deletes the previous word, `Ctrl+K/U` delete to the end/start of the line, `Ctrl+Y` yanks, `Ctrl+R` searches history, and `Ctrl+P/N` select previous/next history (or previous/next line in terminal Emacs). Explicit terminal `Ctrl+P/N` bindings send the control characters instead of opening VS Code’s file picker, even when only the keybindings file has been imported. Terminal Emacs also receives prefixes such as `Ctrl+X`. This profile controls key routing; the shell or terminal application supplies the editing behavior.

While terminal input has focus, `Ctrl+W` is sent immediately instead of starting pane commands. Use the mouse or Command Palette for VS Code buffer/pane actions, or return focus to an editor before using `Ctrl+W` chords. VS Code buffer shortcuts such as `Ctrl+Tab` are also passed to the terminal by this setting.

The profile uses native window decorations and enables experimental editor GPU acceleration. The NixOS launcher separately supplies native Wayland and Vulkan flags; these JSON files do not configure launcher arguments.
