# BetterOrgBrowser Roadmap

BetterOrgBrowser is intended to grow from a live Salesforce metadata browser into a granular metadata retrieval, inspection, permission-set patching, and dependency assistant for VS Code.

## Vision

Salesforce developers often need to retrieve or inspect one exact thing: a field, a Flow, an Apex class, a permission, a record type, or a related dependency. Standard metadata browsing can be too broad or too slow in large orgs.

BetterOrgBrowser should make that workflow feel precise:

```text
Find exact metadata → inspect it → select it → generate package.xml → retrieve or patch it → understand dependencies
```

The standout workflow is granular Permission Set patching:

```text
Git has a truncated Permission Set
Org has the full Permission Set
Developer browses remote permission entries
Developer syncs one selected entry into local XML
Result: tiny clean diff instead of full Permission Set churn
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
- List authorized orgs.
- Select org through VS Code QuickPick.
- Display selected org in the tree.
- Persist selected org across reloads.
- Add Salesforce CLI output logging.

## Phase 2 — Live metadata browsing ✅ Done

Supported live metadata categories:

- Apex Classes
- Flows
- Custom Objects
- Object Fields
- Permission Sets

## Phase 3 — Metadata inspection ✅ Done

Implemented:

- Right-click Show Field Details.
- Right-click Copy API Name.
- Field metadata stored on tree nodes.
- Permission Set Object Permission details.
- Permission Set Field Permission details.

## Phase 4 — Manifest generation ✅ Done

Implemented:

- Add to Manifest.
- Package XML builder.
- Preview Manifest.
- Write Manifest to File.
- Remove from Manifest.
- Clear Manifest Selections.
- Show Manifest Selections.
- Persist manifest selections.
- Status bar manifest count.

## Phase 5 — Retrieval ✅ First pass done

Implemented:

- Backend retrieve service.
- Retrieve Manifest command.
- Validation for workspace folder, `sfdx-project.json`, and `manifest/package.xml`.
- Retrieval tested successfully in a separate SFDX project.
- Friendly retrieve summary.
- Retrieve output channel logging.
- Readable retrieve failure logging.

Remaining improvements:

- Add Retrieve Selected Metadata convenience command.
- Add richer retrieve result actions.

## Phase 6 — Metadata expansion 🚧 In progress

Implemented:

- Permission Sets live listing.
- Permission Set manifest support.

Still planned:

- Profiles
- Lightning Web Components
- Aura Components
- FlexiPages
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

## Phase 7 — Rich Custom Object drilldown

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

## Phase 8 — Permission Set deep browser 🚧 In progress

Primary differentiator feature.

Current working shape:

```text
Permission Sets
└── My_Permission_Set
    ├── Object Permissions
    │   └── Account
    │       ├── Read: Yes
    │       ├── Create: Yes
    │       ├── Edit: Yes
    │       ├── Delete: No
    │       ├── View All Records: No
    │       └── Modify All Records: No
    ├── Field Permissions
    │   └── Account.Custom_Field__c
    │       ├── Readable: Yes
    │       └── Editable: Yes
    ├── Apex Class Access
    ├── Flow Access
    ├── Custom Permissions
    ├── Tab Settings
    └── User Permissions
```

Implemented:

- Permission Set folder shell.
- Object Permissions parser.
- Field Permissions parser.
- Expandable Object Permission detail rows.
- Expandable Field Permission detail rows.
- Metadata-format temporary retrieve for remote Permission Set XML.
- Inline Sync Field Permission Entry command.
- Single-entry merge into local source-format Permission Set XML.

Next improvements:

- Insert synced Field Permission blocks in sorted/stable order instead of appending near the bottom.
- Add Sync Object Permission Entry.
- Cache remote Permission Set XML during a session to avoid repeated CLI retrieves.
- Fill Apex Class Access.
- Fill Flow Access.
- Fill Custom Permissions.
- Fill Tab Settings.
- Fill User Permissions.
- Add better icons/labels for permission sync actions.

## Phase 9 — Dependency awareness

Future feature ideas:

- Field dependency lookup.
- Flow dependency extraction.
- Apex references.
- Permission dependencies.
- Object dependency graph.
- Add dependencies to manifest.
- Warn when selected metadata may be incomplete.

## Phase 10 — Caching and large org performance

Needed before heavy enterprise usage.

Features:

- Cache metadata list responses.
- Cache object describe responses.
- Cache remote Permission Set XML responses.
- Add refresh controls.
- Add loading indicators.
- Avoid repeated CLI calls.
- Add max result warnings.

## Phase 11 — Better UI

Possible improvements:

- Dedicated manifest selections tree section.
- Output channel for CLI logs.
- Tree icons by metadata type.
- Search/filter metadata.
- Multi-select support.
- Better field detail display.
- Selected-state indicators for manifest entries.
- Inline one-click sync/retrieve affordances similar to the standard Org Browser UX.

## Phase 12 — Packaging

Eventually:

```bash
npm install -g @vscode/vsce
vsce package
```

Output:

```text
better-org-browser-0.0.1.vsix
```

## Immediate next session checklist

1. Pull latest:

```bash
git pull
npm install
npm run compile
```

2. Press `F5`.
3. Open SFDX test project in Extension Development Host.
4. Verify selected org persisted.
5. Verify manifest selections persisted.
6. Verify Permission Set browsing still works.
7. Verify Field Permission sync still works.
8. Improve sorted insertion for synced Field Permission entries.
9. Add Object Permission sync.
10. Begin modularizing `extension.ts`.

## Guardrails

- Keep the extension repo as a VS Code extension repo.
- Use a separate SFDX test project for retrieval and sync testing.
- Do not commit retrieved metadata into the extension repo.
- Do not commit local scratch describe JSON or `.better-org-browser` temp output.
- Keep generated folders like `node_modules` and `out` ignored.
