const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const Module = require('node:module');
const originalLoad = Module._load;
const handlers = new Map(), errors = [], notices = [];
const vscode = {
    commands: { registerCommand(name, fn) { handlers.set(name, fn); return { dispose() {} }; } },
    ProgressLocation: { Notification: 15 },
    window: {
        createOutputChannel: () => ({ appendLine() {}, show() {}, dispose() {} }),
        withProgress: async (_, fn) => fn(),
        showInformationMessage: message => notices.push(message),
        showErrorMessage: message => errors.push(message)
    }
};
Module._load = function(name, ...args) {
    if (name === 'vscode') return vscode;
    if (name === '../workspace/project') return { projectRoot: async () => ({ fsPath: process.cwd() }) };
    return originalLoad.call(this, name, ...args);
};
const { registerRetrieveCommands } = require('../out/commands/retrieveCommands');
const { PackageXmlBuilder } = require('../out/packageXml/packageXmlBuilder');
Module._load = originalLoad;

test('inline retrieve targets only the clicked metadata and preserves selections; rejects stale and informational nodes', async () => {
    const manifest = new PackageXmlBuilder(); manifest.add('ApexClass', 'KeepSelected');
    const calls = [];
    let fail = false;
    registerRetrieveCommands({ extension: { subscriptions: [] }, manifest,
        provider: { selectedOrgTarget: 'QA', service: { cli: { retrieveManifest: async (org, file, root) => {
            calls.push({ org, file, root, xml: await fs.readFile(file, 'utf8') });
            if (fail) throw new Error('fixture failure');
            return JSON.stringify({ status: 0, result: { success: true, done: true } });
        } } } }, previews: { show: async () => {} } });
    const retrieve = handlers.get('betterOrgBrowser.retrieveMetadata');
    for (const [type, member] of [['CustomObject', 'Invoice__c'], ['CustomField', 'Invoice__c.Amount__c'],
        ['ValidationRule', 'Invoice__c.Positive'], ['PermissionSet', 'Sales'], ['Report', 'Sales/Pipeline'],
        ['ReportFolder', 'Sales'], ['LightningComponentBundle', 'panel'], ['CustomLabel', 'Greeting']]) {
        await retrieve({ org: 'QA', data: { manifest: { type, member } } });
        const call = calls.at(-1);
        assert.equal(call.org, 'QA'); assert.equal(call.root, process.cwd());
        assert.ok(call.xml.includes(`<name>${type}</name>`));
        assert.ok(call.xml.includes(`<members>${member}</members>`));
        assert.ok(!call.xml.includes('KeepSelected'));
        await assert.rejects(fs.stat(call.file), { code: 'ENOENT' });
    }
    assert.equal(errors.length, 0); assert.equal(notices.length, 8);
    await retrieve({ org: 'Old', data: { manifest: { type: 'CustomObject', member: 'Wrong__c' } } });
    await retrieve({ org: 'QA', data: {} });
    assert.equal(calls.length, 8); assert.equal(errors.length, 2);
    fail = true;
    await retrieve({ org: 'QA', data: { manifest: { type: 'CustomObject', member: 'Invoice__c' } } });
    await assert.rejects(fs.stat(calls.at(-1).file), { code: 'ENOENT' });
    assert.match(errors.at(-1), /fixture failure/);
    assert.deepEqual(manifest.getSelections(), [{ type: 'ApexClass', member: 'KeepSelected' }]);
});

test('inline download is contributed for manifest-capable nodes alongside existing permission sync', () => {
    const menus = require('../package.json').contributes.menus['view/item/context'];
    const retrieve = menus.find(item => item.command === 'betterOrgBrowser.retrieveMetadata');
    assert.match(retrieve.group, /^inline/);
    assert.equal(retrieve.when, 'view == betterOrgBrowserView && viewItem =~ /:manifest/ && !(viewItem =~ /:download/)');
    assert.ok(menus.some(item => item.command === 'betterOrgBrowser.syncPermissionSetEntry' && item.group.startsWith('inline')));
});
