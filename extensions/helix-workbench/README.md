# Helix Workbench

Local VS Code extension for shared text and terminal buffers across editor
groups. Used with Dance and its upstream Helix keymap on maas.

- `sio.buffers.pick`: choose a text or terminal buffer, opening it in this pane.
- `sio.buffers.next` / `previous`: cycle the shared list in the current pane.
- `sio.buffers.close`: close a saved text buffer everywhere without collapsing
  splits. Refuses dirty buffers. Terminal buffers require confirmation before
  stopping their process. Closing the last buffer creates a scratch buffer.
- `sio.panes.close`: close this pane, preserving its text and terminal buffers
  in a surviving pane. The last pane stays open.
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

From the repository root, install the included VSIX with
`code --install-extension extensions/helix-workbench/helix-workbench-0.3.0.vsix`.

To build an updated version from this directory, increment `package.json`'s version, run
`python3 package.py /tmp/helix-workbench.vsix`, then
`code --install-extension /tmp/helix-workbench.vsix`. Reload the window to
load the new extension code.

## Startup dashboard

`Helix: Open Dashboard` opens a theme-aware keyboard dashboard. Use F for
file search, O to open a folder, R for recent projects/files, N for a new
buffer, B for shared buffers, T for a terminal, and P for the command palette.
Buttons also support mouse, Tab, and Enter.

It opens automatically in empty windows when no editors are restored. Opening
a folder or workspace shows the project instead; if it has no restored editors,
the file explorer opens so you can select a file. Set
`workbench.startupEditor` to `none` to replace the built-in welcome page.
Set `helixWorkbench.dashboard.showOnStartup` to `false` to disable automatic
opening; the command remains available.

The dashboard shows up to nine recent folders and workspaces from VS Code
history. Click an entry or press 1–9 to reopen it in the current window.
The list refreshes whenever the dashboard is reopened. R opens the full
native recent list.

Performance: recent projects refresh at most once per 15 seconds and update
only the list through webview messages. Concurrent requests are coalesced;
unchanged lists do not update the DOM. Buffer reconciliation uses sets, skips
focus-only tab events, and writes workspace state only when text order changes.
The user profile assigns Dance, its Helix keymap, and Helix Workbench to
extension-host affinity 1, isolating these extensions from the default host.
