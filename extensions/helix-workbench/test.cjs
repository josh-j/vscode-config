const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

exports.run = async () => {
  const report = '/tmp/vscode-helix-panes-result.json';
  try {
    const extension = await vscode.extensions.getExtension('sio.helix-workbench').activate();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helix-pane-files-'));
    const files = ['a.txt', 'b.txt', 'c.txt'].map(name => {
      const file = path.join(root, name);
      fs.writeFileSync(file, name + '\n');
      return vscode.Uri.file(file);
    });
    const id = uri => uri.toString();
    const groups = vscode.window.tabGroups;
    const show = (uri, column) => vscode.window.showTextDocument(uri, {viewColumn: column, preview: false});
    const command = async name => {
      const result = await vscode.commands.executeCommand(name);
      await new Promise(resolve => setTimeout(resolve, 100));
      return result;
    };
    await show(files[0], 1);
    await command('workbench.action.splitEditorRight');
    await show(files[1], 2);
    await show(files[0], 1);
    await command('sio.buffers.next');
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), id(files[1]));
    assert.equal(groups.activeTabGroup.viewColumn, 1, 'cycle stays in this pane');
    assert.equal(extension.buffers().length, 2, 'duplicates across panes count once');
    await command('sio.buffers.previous');
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), id(files[0]));

    const dirty = await show(files[2], 2);
    await dirty.edit(builder => builder.insert(new vscode.Position(0, 0), 'unsaved '));
    assert(dirty.document.isDirty);
    await command('sio.panes.close');
    assert.equal(groups.all.length, 1);
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), id(files[0]), 'surviving view restored');
    assert(extension.buffers().includes(id(files[2])), 'closed pane retains buffer');
    const restored = await show(files[2], 1);
    assert(restored.document.getText().startsWith('unsaved '));
    assert(restored.document.isDirty, 'pane closure did not save or discard edits');
    assert.equal(await command('sio.buffers.close'), false, 'dirty close refused');
    assert(extension.buffers().includes(id(files[2])));
    await restored.document.save();

    await show(files[1], 1);
    await command('workbench.action.splitEditorRight');
    await show(files[1], 2);
    assert.equal(await command('sio.buffers.close'), true);
    assert.equal(groups.all.length, 2, 'buffer closure retains panes');
    assert(!extension.buffers().includes(id(files[1])), 'closed in every pane');
    await show(files[0], 2);
    await command('sio.panes.only');
    assert.equal(groups.all.length, 1);
    assert.equal(vscode.window.activeTextEditor.document.uri.toString(), id(files[0]), 'only preserves active buffer');
    assert(extension.buffers().includes(id(files[2])));

    await command('sio.buffers.close');
    assert.equal(extension.buffers().length, 1);
    await command('sio.buffers.close');
    assert.equal(groups.all.length, 1);
    assert.equal(vscode.window.activeTextEditor.document.uri.scheme, 'untitled');
    assert.equal(extension.buffers().length, 1, 'last close creates one scratch buffer');
    await command('workbench.action.splitEditorRight');
    const draft = await vscode.workspace.openTextDocument({content: 'unsaved draft'});
    await vscode.window.showTextDocument(draft, {viewColumn: 2, preview: false});
    await command('sio.panes.close');
    assert.equal(groups.all.length, 1);
    assert(extension.buffers().includes(draft.uri.toString()));
    await show(draft.uri, 1);
    assert.equal(vscode.window.activeTextEditor.document.getText(), 'unsaved draft');
    assert(vscode.window.activeTextEditor.document.isDirty, 'untitled draft also survives pane close');
    // Live terminals are buffers, even when two terminals have the same title.
    const shell = '/run/current-system/sw/bin/bash';
    const terminal = vscode.window.createTerminal({name: 'buffer-shell', shellPath: shell,
      shellArgs: ['--noprofile', '--norc'], location: {viewColumn: 1}});
    terminal.show();
    await new Promise(resolve => setTimeout(resolve, 500));
    const processId = await terminal.processId;
    const terminalId = extension.buffers().find(key => key.startsWith('terminal:'));
    assert(terminalId, 'terminal included in shared buffers');
    await command('sio.buffers.previous');
    assert(groups.activeTabGroup.activeTab.input instanceof vscode.TabInputText, 'cycle from terminal to text');
    await command('sio.buffers.next');
    assert(groups.activeTabGroup.activeTab.input instanceof vscode.TabInputTerminal, 'cycle back into terminal');
    assert.equal(vscode.window.activeTerminal, terminal);
    await show(files[0], 1);
    await command('workbench.action.splitEditorRight');
    // The terminal is the last buffer. Previous from the first brings it here.
    const buffers = extension.buffers();
    const steps = (buffers.indexOf(id(files[0])) - buffers.indexOf(terminalId) + buffers.length) % buffers.length;
    for (let i = 0; i < steps; i++) await command('sio.buffers.previous');
    assert(groups.activeTabGroup.activeTab.input instanceof vscode.TabInputTerminal);
    assert.equal(groups.activeTabGroup.viewColumn, 2, 'terminal moves into requested pane');
    assert.equal(await terminal.processId, processId, 'same shell survives buffer move');
    assert(extension.buffers().includes(terminalId), 'terminal identity survives move');
    const second = vscode.window.createTerminal({name: 'buffer-shell', shellPath: shell,
      shellArgs: ['--noprofile', '--norc'], location: {viewColumn: 2}});
    second.show();
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(extension.buffers().filter(key => key.startsWith('terminal:')).length, 2,
      'same-title terminals remain distinct');
    await command('sio.panes.close');
    assert.equal(groups.all.length, 1);
    assert(vscode.window.terminals.includes(terminal) && vscode.window.terminals.includes(second),
      'closing pane preserves both terminals');
    assert.equal(extension.buffers().filter(key => key.startsWith('terminal:')).length, 2);
    await show(files[0], 1);
    await command('workbench.action.splitEditorRight');
    await command('sio.panes.only');
    assert.equal(groups.all.length, 1);
    assert.equal(extension.buffers().filter(key => key.startsWith('terminal:')).length, 2,
      'only-pane preserves terminal buffers from discarded pane');
    const marker = path.join(root, 'terminal-state');
    terminal.sendText(`printf '%s' retained > '${marker}'`);
    for (let attempt = 0; !fs.existsSync(marker) && attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(fs.readFileSync(marker, 'utf8'), 'retained', 'shell still accepts input after pane operations');
    const panel = vscode.window.createTerminal({name: 'panel-shell', shellPath: shell,
      shellArgs: ['--noprofile', '--norc'], location: vscode.TerminalLocation.Panel});
    panel.show();
    await new Promise(resolve => setTimeout(resolve, 500));
    const panelPid = await panel.processId;
    await command('sio.terminals.open');
    assert(groups.activeTabGroup.activeTab.input instanceof vscode.TabInputTerminal,
      'existing panel terminal becomes an editor buffer');
    assert.equal(vscode.window.activeTerminal, panel);
    assert.equal(await panel.processId, panelPid, 'adoption preserves the panel shell');
    terminal.dispose(); second.dispose(); panel.dispose();

    fs.writeFileSync(report, JSON.stringify({passed: true, checks: [
      'global deduplicated buffer cycle', 'active pane retained', 'dirty buffer preserved on pane close',
      'dirty buffer close refused', 'buffer closed across panes without collapsing them',
      'only-pane retains other buffers and current view', 'last-buffer scratch replacement',
      'untitled draft preserved on pane close',
      'terminal buffer cycling and moving preserves process and identity',
      'same-title terminals remain distinct', 'pane close and only-pane retain live shells',
      'existing panel terminal adopted without restarting its shell',
    ]}));
  } catch (error) {
    fs.writeFileSync(report, JSON.stringify({passed: false, error: String(error), stack: error.stack}));
    throw error;
  }
};
