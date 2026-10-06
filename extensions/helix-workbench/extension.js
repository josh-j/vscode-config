const vscode = require('vscode');
const { registerDashboard } = require('./dashboard');

function activate(context) {
  const groups = vscode.window.tabGroups;
  let order = context.workspaceState.get('buffers', []);
  let savedOrder = order;
  let busy = false;
  let terminalSerial = 0;
  const terminalIds = new WeakMap();
  const terminalTabs = new Map();
  const isTerminal = tab => tab?.input instanceof vscode.TabInputTerminal;

  function id(tab) {
    if (tab?.input instanceof vscode.TabInputText) return tab.input.uri.toString();
    if (!isTerminal(tab)) return undefined;
    if (!terminalIds.has(tab)) terminalIds.set(tab, `terminal:${++terminalSerial}`);
    const key = terminalIds.get(tab);
    terminalTabs.set(key, tab);
    return key;
  }

  function tabs() {
    return groups.all.flatMap(group => group.tabs)
      .filter(tab => tab.input instanceof vscode.TabInputText || isTerminal(tab));
  }

  function sync() {
    const present = new Set(tabs().map(id));
    order = order.filter(key => present.has(key));
    const known = new Set(order);
    for (const key of present) if (!known.has(key)) { order.push(key); known.add(key); }
    for (const key of terminalTabs.keys()) if (!present.has(key)) terminalTabs.delete(key);
    // Terminal tab IDs are session-local; restored tabs get fresh identities.
    const textOrder = order.filter(key => !terminalTabs.has(key));
    if (textOrder.length !== savedOrder.length || textOrder.some((key, index) => key !== savedOrder[index])) {
      savedOrder = textOrder;
      void context.workspaceState.update('buffers', textOrder);
    }
    return order;
  }

  const current = () => id(groups.activeTabGroup.activeTab);
  const activeId = group => id(group.activeTab);

  async function until(predicate) {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('VS Code did not finish switching the buffer view.');
  }

  async function focusGroup(group) {
    for (let attempt = 0; attempt < groups.all.length; attempt++) {
      if (groups.activeTabGroup === group) return;
      await vscode.commands.executeCommand('workbench.action.focusNextGroup');
    }
    if (groups.activeTabGroup !== group) throw new Error('Buffer pane is no longer open.');
  }

  async function show(key, column = groups.activeTabGroup.viewColumn, preserveFocus = false) {
    const tab = terminalTabs.get(key);
    if (!tab) {
      const editor = await vscode.window.showTextDocument(vscode.Uri.parse(key), {
        viewColumn: column, preview: false, preserveFocus,
      });
      await until(() => groups.all.some(group => group.viewColumn === editor.viewColumn && activeId(group) === key));
      if (!preserveFocus) {
        await focusGroup(groups.all.find(group => group.viewColumn === editor.viewColumn));
        await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        await until(() => vscode.window.activeTextEditor?.document.uri.toString() === key
          && vscode.window.activeTextEditor?.viewColumn === editor.viewColumn);
      }
      return editor;
    }
    const target = groups.all.find(group => group.viewColumn === column);
    if (!target) throw new Error('Terminal destination pane is no longer open.');
    const previous = groups.activeTabGroup;
    await focusGroup(tab.group);
    await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', tab.group.tabs.indexOf(tab));
    await until(() => groups.activeTabGroup.activeTab === tab);
    if (tab.group !== target) {
      await vscode.commands.executeCommand('moveActiveEditor', {to: 'position', by: 'group', value: target.viewColumn});
      await until(() => groups.activeTabGroup === target && isTerminal(target.activeTab));
      // Moving a tab creates a new API Tab object, but it is the same live buffer.
      terminalIds.set(target.activeTab, key);
      terminalTabs.set(key, target.activeTab);
    }
    if (preserveFocus && groups.all.includes(previous)) await focusGroup(previous);
  }

  async function cycle(offset) {
    const buffers = sync();
    if (!buffers.length) return;
    const index = buffers.indexOf(current());
    const next = index < 0 ? (offset > 0 ? 0 : buffers.length - 1)
      : (index + offset + buffers.length) % buffers.length;
    await show(buffers[next]);
  }

  async function pick() {
    const active = current();
    const dirty = new Set(tabs().filter(tab => tab.isDirty).map(id));
    const selected = await vscode.window.showQuickPick(sync().map((key, index) => ({
      label: `${index + 1} ${terminalTabs.has(key) ? terminalTabs.get(key).label : vscode.workspace.asRelativePath(vscode.Uri.parse(key))}`,
      description: [terminalTabs.has(key) ? 'terminal' : '', key === active ? 'current' : '', dirty.has(key) ? 'modified' : ''].filter(Boolean).join(' · '),
      key,
    })), { placeHolder: 'Shared buffers — open in this pane', matchOnDescription: true });
    if (selected) await show(selected.key);
  }

  // Copy text references and move terminal views before closing their old pane.
  // A moved terminal retains its process, scrollback, and input state.
  async function preserve(source, target) {
    const existing = new Set(target.tabs.map(id).filter(Boolean));
    for (const tab of [...source.tabs]) {
      const key = id(tab);
      if (key && !existing.has(key)) {
        await show(key, target.viewColumn, true);
        existing.add(key);
      }
    }
  }

  async function closePane() {
    // Keep the final pane and its buffers open; pane-close must not quit VS Code.
    if (groups.all.length === 1) return;
    const source = groups.activeTabGroup;
    const target = groups.all.find(group => group !== source);
    const restore = activeId(target);
    await preserve(source, target);
    const closed = !groups.all.includes(source) || await groups.close(source, true);
    if (closed && restore) await show(restore, target.viewColumn);
  }

  async function onlyPane() {
    const target = groups.activeTabGroup;
    const restore = activeId(target);
    for (const source of [...groups.all]) {
      if (source === target) continue;
      await preserve(source, target);
      if (groups.all.includes(source) && !await groups.close(source, true)) break;
    }
    if (restore) await show(restore, target.viewColumn);
  }

  async function closeBuffer() {
    const key = current();
    if (!key) return;
    const affected = tabs().filter(tab => id(tab) === key);
    if (affected.some(tab => tab.isDirty)) {
      void vscode.window.showWarningMessage('Buffer has unsaved changes. Save it before closing.');
      return false;
    }
    if (terminalTabs.has(key)) {
      const answer = await vscode.window.showWarningMessage('Close this terminal buffer and stop its process?', {modal: true}, 'Close Terminal');
      if (answer !== 'Close Terminal') return false;
    }
    const buffers = sync();
    const index = buffers.indexOf(key);
    const activeGroup = groups.activeTabGroup;
    const visible = groups.all.filter(group => activeId(group) === key);
    // A terminal cannot be mirrored into multiple groups. Prefer a text buffer
    // when replacing several visible copies of the same text document.
    const candidates = [...buffers.slice(index + 1), ...buffers.slice(0, index)];
    const replacement = candidates.find(candidate => visible.length === 1 || !terminalTabs.has(candidate));
    const scratch = replacement ? undefined : await vscode.workspace.openTextDocument();
    for (const group of visible) {
      if (replacement) await show(replacement, group.viewColumn, true);
      else await vscode.window.showTextDocument(scratch, {viewColumn: group.viewColumn, preview: false, preserveFocus: true});
    }
    if (!await groups.close(affected, true)) return false;
    const active = activeId(activeGroup);
    if (active) await show(active, activeGroup.viewColumn);
    return true;
  }

  async function openTerminal() {
    const target = groups.activeTabGroup;
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
      terminal.show();
      await vscode.commands.executeCommand('workbench.action.terminal.moveToEditor');
      await until(() => isTerminal(groups.activeTabGroup.activeTab));
      const key = id(groups.activeTabGroup.activeTab);
      await show(key, target.viewColumn);
    } else {
      vscode.window.createTerminal({location: {viewColumn: target.viewColumn}}).show();
    }
  }

  const commands = {
    'sio.buffers.pick': pick,
    'sio.buffers.next': () => cycle(1),
    'sio.buffers.previous': () => cycle(-1),
    'sio.buffers.close': closeBuffer,
    'sio.panes.close': closePane,
    'sio.panes.only': onlyPane,
    'sio.terminals.open': openTerminal,
  };
  for (const [name, run] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(name, async () => {
      if (busy) return;
      busy = true;
      try { return await run(); }
      finally { busy = false; sync(); }
    }));
  }
  context.subscriptions.push(groups.onDidChangeTabs(event => {
    if (!busy && (event.opened.length || event.closed.length)) sync();
  }));
  sync();
  registerDashboard(context);
  return { buffers: () => [...sync()] };
}

module.exports = { activate };
