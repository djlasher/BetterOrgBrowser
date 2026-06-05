# BetterOrgBrowser Roadmap

BetterOrgBrowser is intended to grow from a live Salesforce metadata browser into a granular metadata retrieval, inspection, and dependency assistant for VS Code.

## Vision

Salesforce developers often need to retrieve or inspect one exact thing: a field, a Flow, an Apex class, a permission, a record type, or a related dependency. Standard metadata browsing can be too broad or too slow in large orgs.

BetterOrgBrowser should make that workflow feel precise:

```text
Find exact metadata → inspect it → select it → generate package.xml → retrieve it → understand dependencies
```

## Phase 0 — Extension foundation ✅ Done

- TypeScript VS Code extension scaffold.
- Activity Bar container.
- TreeDataProvider implementation.
- Launch/debug configuration.
- Basic README.
- GitHub repo setup.
- `.gitignore` for Node and local scratch files.

## Phase 1 — Salesforce org connection ✅ Done

- Invoke Salesforce CLI from extension.
- Handle Windows `sf.cmd` behavior.
- List authorized orgs with:

```bash
sf org list --json
```

- Select org through VS Code QuickPick.
- Display selected org in the tree.

## Phase 2 — Live metadata browsing ✅ Done

Supported live metadata categories:

- Apex Classes
- Flows
- Custom Objects
- Object Fields

Implemented commands behind the scenes:

```bash
sf org list metadata --metadata-type ApexClass --target-org <org> --json
sf org list metadata --metadata-type Flow --target-org <org> --json
sf org list metadata --metadata-type CustomObject --target-org <org> --json
sf sobject describe --sobject <object> --target-org <org> --json
```

Current tree shape:

```text
Better Org Browser
├── Connected Org: <org>
├── Custom Objects
│   └── Account
│       └── Fields
│           └── Active__c
├── Apex Classes
├── Flows
└── Permission Sets
```

## Phase 3 — Metadata inspection ✅ Done

Implemented:

- Right-click **Show Field Details**.
- Right-click **Copy API Name**.
- Field metadata stored on tree nodes.

Field details currently include:

- Object
- API Name
- Label
- Type
- Required
- Createable
- Updateable
- Calculated

## Phase 4 — Manifest generation ✅ Done

Implemented:

- Right-click **Add to Manifest**.
- In-memory manifest selection bucket.
- Package XML builder grouped by metadata type.
- **Preview Manifest** command.
- **Write Manifest to File** command.

Generated file:

```text
manifest/package.xml
```

Example generated package.xml:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>devedapp__DeveloperEditionUtils</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>Account.Active__c</members>
        <name>CustomField</name>
    </types>
    <version>66.0</version>
</Package>
```

## Phase 5 — Retrieval ✅ First pass done

Implemented:

- Backend retrieve service.
- **Retrieve Manifest** command exposed.
- Validation for workspace folder, `sfdx-project.json`, and `manifest/package.xml`.
- Runs:

```bash
sf project retrieve start --manifest manifest/package.xml --target-org <selected-org> --json
```

Tested successfully in separate SFDX test project.

Next improvements:

- Show friendly retrieve summary instead of raw JSON.
- Add output channel logging.
- Add failure parsing and readable error messages.
- Add **Retrieve Selected Metadata** convenience command.

## Phase 6 — Manifest selection UX 🔜 Next

Current problem: selections are invisible except through generated preview/output.

Next features:

- **Clear Manifest Selections**.
- **Show Manifest Selections**.
- **Remove from Manifest**.
- Manifest selection count.
- Optional tree section:

```text
Manifest Selections (3)
├── ApexClass
│   └── MyClass
├── CustomField
│   └── Account.Active__c
└── Flow
    └── MyFlow
```

- Persist selections with VS Code workspace state.

## Phase 7 — More metadata types

Add live browsing for:

- Permission Sets
- Profiles
- Lightning Web Components
- Aura Components
- FlexiPages / Lightning Pages
- Layouts
- Tabs
- Custom Labels
- Custom Metadata Types
- Custom Metadata Records
- Static Resources
- Email Templates
- Queues
- Groups
- Permission Set Groups

Likely commands:

```bash
sf org list metadata --metadata-type PermissionSet --target-org <org> --json
sf org list metadata --metadata-type LightningComponentBundle --target-org <org> --json
sf org list metadata --metadata-type FlexiPage --target-org <org> --json
sf org list metadata --metadata-type Layout --target-org <org> --json
```

## Phase 8 — Rich Custom Object drilldown

Expand Custom Objects beyond Fields:

```text
Account
├── Fields
├── Record Types
├── Validation Rules
├── Field Sets
├── List Views
├── Compact Layouts
├── Search Layouts
├── Web Links
└── Child Relationships
```

Potential sources:

- `sf sobject describe`
- Metadata API list calls
- Metadata retrieve + XML parsing

## Phase 9 — Permission Set deep browser

This is one of the main differentiators.

Goal:

```text
Permission Sets
└── My_Permission_Set
    ├── Object Permissions
    ├── Field Permissions
    ├── Apex Class Access
    ├── Flow Access
    ├── Custom Permissions
    ├── Tab Settings
    └── User Permissions
```

Potential approach:

1. List permission sets.
2. Retrieve selected permission set XML.
3. Parse XML locally.
4. Render nested permissions in tree.
5. Allow adding individual permission set components or full permission set to manifest.

## Phase 10 — Dependency awareness

Future feature ideas:

- Field dependency lookup.
- Flow dependency extraction.
- Apex references.
- Permission dependencies.
- Object dependency graph.
- Add dependencies to manifest.
- Warn when selected metadata may be incomplete.

Example:

```text
Selected Flow: Case_High_Risk_Flagging
Detected dependencies:
├── Case.High_Risk__c
├── Case.Priority
├── Queue.Support
└── Custom Label.High_Risk_Message
```

## Phase 11 — Caching and large org performance

Needed before using heavily in giant client orgs.

Features:

- Cache metadata list responses by org + metadata type.
- Cache object describe responses by org + object.
- Add refresh controls at category and object levels.
- Add loading indicators.
- Avoid repeated CLI calls when expanding/collapsing.
- Add max result warnings for huge orgs.

## Phase 12 — Better UI

Possible improvements:

- Dedicated webview for manifest selections.
- Output channel for CLI logs.
- Status bar item showing selected org and manifest count.
- Tree icons by metadata type.
- Search/filter metadata.
- Multi-select support if VS Code tree supports needed behavior.
- Better field detail display in markdown/webview instead of modal.

## Phase 13 — Packaging

Eventually:

```bash
npm install -g @vscode/vsce
vsce package
```

Output:

```text
better-org-browser-0.0.1.vsix
```

Then install locally in VS Code as a normal extension.

## Immediate next session checklist

Start here next time:

1. Pull latest:

```bash
git pull
npm install
npm run compile
```

2. Press `F5`.
3. In Extension Development Host, open the SFDX test project.
4. Select Claygentforce org.
5. Verify:

```text
Custom Objects → Account → Fields
```

6. Add a field/class/flow to manifest.
7. Write manifest.
8. Retrieve manifest.
9. Build **Clear Manifest Selections** and **Show Manifest Selections** next.

## Guardrails

- Keep the extension repo as a VS Code extension repo.
- Use a separate SFDX test project for retrieval testing.
- Do not commit retrieved metadata into the extension repo.
- Do not commit local scratch describe JSON.
- Node-specific generated files like `node_modules` and `out` should remain ignored.
