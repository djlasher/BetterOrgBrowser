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
- List authorized orgs.
- Select org through VS Code QuickPick.
- Display selected org in the tree.
- Persist selected org across reloads.

## Phase 2 — Live metadata browsing ✅ Done

Supported live metadata categories:

- Apex Classes
- Flows
- Custom Objects
- Object Fields

## Phase 3 — Metadata inspection ✅ Done

Implemented:

- Right-click Show Field Details.
- Right-click Copy API Name.
- Field metadata stored on tree nodes.

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

Remaining improvements:

- Show friendly retrieve summary instead of raw JSON.
- Add output channel logging.
- Add readable failure parsing.
- Add Retrieve Selected Metadata convenience command.

## Phase 6 — Metadata expansion

Add live browsing for:

- Permission Sets
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

## Phase 8 — Permission Set deep browser

Primary differentiator feature.

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
6. Verify status bar manifest count updates.
7. Improve retrieve result formatting.
8. Start Permission Set implementation.
9. Begin modularizing `extension.ts`.

## Guardrails

- Keep the extension repo as a VS Code extension repo.
- Use a separate SFDX test project for retrieval testing.
- Do not commit retrieved metadata into the extension repo.
- Do not commit local scratch describe JSON.
- Keep generated folders like `node_modules` and `out` ignored.
