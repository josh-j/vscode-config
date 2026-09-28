# Helix Workbench

Local VS Code extension for shared text and terminal buffers across editor
groups. Used with Dance and its upstream Helix keymap on maas.

- `sio.buffers.pick`: choose a text or terminal buffer, opening it in this pane.
- `sio.buffers.next` / `previous`: cycle the shared list in the current pane.
- `sio.buffers.close`: close a saved text buffer everywhere without collapsing
  splits. Refuses dirty buffers. Terminal buffers require confirmation before
  stopping their process. Closing the last buffer creates a scratch buffer.
- `sio.panes.close`: close this pane, preserving its text and terminal buffers
  in a surviving pane. The last pane uses VS Code's normal window-close handling.
- `sio.panes.only`: keep this pane and preserve buffers from the other panes.
- `sio.terminals.open`: open the active terminal as a buffer in this pane,
  moving it out of the terminal panel if necessary; create one if none exists.

A terminal has one live view: selecting it from another pane moves that view,
retaining its shell process, scrollback, and input state. Text buffers can appear
in multiple panes. Same-title terminals remain distinct buffers. Text-buffer
order is stored in workspace state; terminal identities are session-local and
are rediscovered from restored editor tabs after reloading VS Code.

Set `terminal.integrated.defaultLocation` to `editor` so new terminals join the
buffer list. Existing panel terminals join when opened with `sio.terminals.open`
or moved into the editor with VS Code's native command. Native tab-close
commands retain VS Code semantics; use these commands for Helix behaviour.
Notebook, diff, and webview tabs retain native VS Code handling.

The extension installs no settings or keybindings. The user profile enables
`Ctrl+Tab` / `Ctrl+Shift+Tab` and `Ctrl+W` pane chords in terminal editors;
`Ctrl+Shift+Space` opens the buffer picker from a terminal. These commands must
be listed in `terminal.integrated.commandsToSkipShell`. Other input goes to the
shell; `Ctrl+W` is reserved for pane chords in terminal buffers.

The extension has no runtime dependencies. `test.cjs` runs through VS Code's
`--extensionDevelopmentPath` / `--extensionTestsPath` extension-host runner
using an isolated user-data directory, never the real editing session. It tests
text/untitled preservation, terminal cycling and movement, duplicate terminal
names, and live-shell survival across pane operations and panel adoption.

To install an updated version, increment `package.json`'s version, run
`python3 package.py /tmp/helix-workbench.vsix`, then
`code --install-extension /tmp/helix-workbench.vsix`. Reload the window to
load the new extension code.
