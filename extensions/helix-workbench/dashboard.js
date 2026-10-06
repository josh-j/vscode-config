const vscode = require('vscode');
const { randomBytes } = require('crypto');
const path = require('path');

const actions = [
  ['f', 'Find file', 'Search files in this workspace', 'workbench.action.quickOpen'],
  ['o', 'Open folder', 'Start with a project directory', 'workbench.action.files.openFolder'],
  ['r', 'Open recent', 'Return to a recent project or file', 'workbench.action.openRecent'],
  ['n', 'New buffer', 'Start an untitled text buffer', 'workbench.action.files.newUntitledFile'],
  ['b', 'Shared buffers', 'Pick a text or terminal buffer', 'sio.buffers.pick'],
  ['t', 'Terminal buffer', 'Open a shell in this pane', 'sio.terminals.open'],
  ['p', 'Command palette', 'Find any workbench command', 'workbench.action.showCommands'],
];
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));

function html(workspace, nonce, projects = [], status = '') {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>Helix Workbench</title><style nonce="${nonce}">
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family, sans-serif); }
main { max-width: 1000px; margin: 0 auto; }
.eyebrow { color: var(--vscode-descriptionForeground); font-size: 12px; letter-spacing: .16em; text-transform: uppercase; }
h1 { font-size: clamp(24px, 4vw, 34px); font-weight: 500; margin: 12px 0; letter-spacing: -.04em; }
.workspace { color: var(--vscode-descriptionForeground); margin: 0 0 24px; overflow-wrap: anywhere; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; }
h2 { font-size: 14px; font-weight: 500; margin: 0 0 14px; color: var(--vscode-descriptionForeground); }
button span { min-width: 0; }
small { overflow-wrap: anywhere; }
@media (max-width: 700px) { .columns { grid-template-columns: 1fr; gap: 20px; } .recent { order: -1; } .start nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 400px) { body { padding: 16px; } .start nav { grid-template-columns: 1fr; } }
nav { display: grid; gap: 6px; }
button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
button:hover { background: var(--vscode-list-hoverBackground); }
button:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
kbd { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border: 1px solid var(--vscode-widget-border, #777); border-radius: 4px; font-family: var(--vscode-editor-font-family, monospace); color: var(--vscode-textLink-foreground); }
strong { display: block; font-weight: 500; }
small { display: block; margin-top: 4px; color: var(--vscode-descriptionForeground); font-size: 12px; }
footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--vscode-widget-border, #777); color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.8; }
</style></head><body><main>
<div class="eyebrow">Helix Workbench</div><h1>Ready when you are.</h1>
<p class="workspace">${escape(workspace || 'Open a folder, find a file, or start a buffer.')}</p>
<div class="columns"><section class="start"><h2>Start working</h2><nav aria-label="Start working">${actions.map(([key, title, description]) => `<button data-key="${key}" type="button"><kbd>${key}</kbd><span><strong>${title}</strong><small>${description}</small></span></button>`).join('')}</nav></section>
<section class="recent"><h2>Recent projects</h2><nav id="recent-projects" aria-label="Recent projects">${projects.length ? projects.map((project, index) => `<button data-key="${index + 1}" type="button"><kbd>${index + 1}</kbd><span><strong>${escape(project.name)}</strong><small>${escape(project.detail)}</small></span></button>`).join('') : `<p class="workspace">${escape(status || 'No recent projects yet. Open a folder to get started.')}</p>`}</nav></section></div>
<footer>Press a letter to start · 1–9 to open a recent project · Tab / Shift+Tab to move · Enter to select<br>Ctrl+W, H/J/K/L: move between panes · Ctrl+W, Q: close a split pane</footer>
</main><script nonce="${nonce}">
const api = acquireVsCodeApi();
// Delegate clicks so changing recent projects does not rebuild the page or listeners.
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-key]');
  if (button) api.postMessage({action: button.dataset.key});
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return;
  const button = [...document.querySelectorAll('button[data-key]')].find(button => button.dataset.key === event.key.toLowerCase());
  if (button) { event.preventDefault(); button.click(); }
});
window.addEventListener('message', event => {
  if (event.data?.type !== 'projects') return;
  const nav = document.getElementById('recent-projects');
  const focused = nav.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
  const nodes = event.data.projects.map((project, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.key = String(index + 1);
    const key = document.createElement('kbd'); key.textContent = String(index + 1);
    const text = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = project.name;
    const detail = document.createElement('small'); detail.textContent = project.detail;
    text.append(title, detail); button.append(key, text); return button;
  });
  if (!nodes.length) {
    const empty = document.createElement('p'); empty.className = 'workspace';
    empty.textContent = event.data.status || 'No recent projects yet. Open a folder to get started.';
    nodes.push(empty);
  }
  nav.replaceChildren(...nodes);
  if (focused) {
    const replacement = [...nav.querySelectorAll('button')].find(button => button.dataset.key === focused);
    if (replacement) replacement.focus();
  }
});
api.postMessage({action: 'ready'});
</script></body></html>`;
}

function registerDashboard(context) {
  let panel;
  let projects = [];
  let status = 'Loading recent projects…';
  let ready = false;
  let pending;
  let refreshedAt = 0;
  let revision = '';
  const payload = () => ({type: 'projects', projects: projects.map(({name, detail}) => ({name, detail})), status});
  function deliver(current) {
    if (panel === current && ready) void current.webview.postMessage(payload());
  }
  async function refresh(current) {
    // Coalesce concurrent requests; reopening within 15 seconds uses the current list.
    if (pending || (refreshedAt && Date.now() - refreshedAt < 15000)) return pending;
    pending = (async () => {
      let nextStatus = '';
      const next = [];
      try {
        const recent = await vscode.commands.executeCommand('_workbench.getRecentlyOpened');
        if (!Array.isArray(recent?.workspaces)) throw new Error('Recent projects unavailable');
        const seen = new Set();
        for (const entry of recent.workspaces) {
          const value = entry.folderUri || entry.workspace?.configPath;
          if (!value) continue;
          const uri = typeof value === 'string' ? vscode.Uri.parse(value) : vscode.Uri.from(value);
          const key = uri.toString();
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({uri, name: entry.label || path.posix.basename(uri.path) || key,
            detail: uri.scheme === 'file' ? uri.fsPath : key});
          if (next.length === 9) break;
        }
      } catch {
        nextStatus = 'Recent projects are unavailable. Press R to use Open Recent.';
      }
      if (panel !== current) return;
      refreshedAt = Date.now();
      const nextRevision = JSON.stringify([next.map(({uri, name, detail}) => [uri.toString(), name, detail]), nextStatus]);
      if (nextRevision === revision) return;
      revision = nextRevision;
      projects = next;
      status = nextStatus;
      deliver(current);
    })();
    const request = pending;
    try { await request; }
    finally { if (pending === request) pending = undefined; }
  }
  function open() {
    if (panel) { panel.reveal(); void refresh(panel); return panel; }
    panel = vscode.window.createWebviewPanel('sio.dashboard', 'Helix Workbench', vscode.ViewColumn.Active,
      {enableScripts: true, localResourceRoots: []});
    const current = panel;
    current.webview.html = html((vscode.workspace.workspaceFolders || []).map(folder => folder.name).join(' / '), randomBytes(16).toString('hex'), projects, status);
    context.subscriptions.push(current, current.onDidDispose(() => { if (panel === current) { panel = undefined; ready = false; pending = undefined; } }),
      current.onDidChangeViewState(event => { if (event.webviewPanel.visible) void refresh(current); }),
      current.webview.onDidReceiveMessage(async message => {
        if (message?.action === 'ready') { ready = true; deliver(current); return; }
        if (typeof message?.action === 'string' && /^[1-9]$/.test(message.action)) {
          const project = projects[Number(message.action) - 1];
          if (!project) return;
          try {
            current.dispose();
            await vscode.commands.executeCommand('vscode.openFolder', project.uri, {forceReuseWindow: true});
            await vscode.commands.executeCommand('workbench.view.explorer');
          }
          catch (error) { void vscode.window.showErrorMessage(`Helix dashboard: ${error.message || error}`); }
          return;
        }
        const action = actions.find(([key]) => key === message?.action);
        if (!action) return;
        try { await vscode.commands.executeCommand(action[3]); }
        catch (error) { void vscode.window.showErrorMessage(`Helix dashboard: ${error.message || error}`); }
      }));
    void refresh(current);
    return current;
  }
  context.subscriptions.push(vscode.commands.registerCommand('sio.dashboard.open', open));
  // Opening a project restarts the extension host, often with no editor tabs yet.
  // Only empty windows get the startup dashboard; projects show their files.
  if (vscode.workspace.getConfiguration('helixWorkbench').get('dashboard.showOnStartup', true)
    && !vscode.window.tabGroups.all.some(group => group.tabs.length)) {
    if (vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length) {
      void vscode.commands.executeCommand('workbench.view.explorer');
    } else {
      open();
      // A fresh dashboard gets the available window space; manual opening keeps layout.
      void vscode.commands.executeCommand('workbench.action.closeSidebar');
      void vscode.commands.executeCommand('workbench.action.closePanel');
    }
  }
}

module.exports = {registerDashboard, html};
