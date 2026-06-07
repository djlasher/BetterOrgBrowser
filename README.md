# BetterOrgBrowser

A VS Code extension for a more granular Salesforce org browser.

BetterOrgBrowser is intended to make Salesforce metadata exploration and retrieval feel closer to a purpose-built developer tool than a flat metadata list. Instead of only browsing broad metadata types, BetterOrgBrowser lets developers drill into nested metadata, select exactly what they need, generate manifests, and sync granular Permission Set entries into a local working copy.

## Why this exists

Salesforce orgs get huge. Standard org browsing tools are useful, but they can become slow or too coarse when you only need a specific field, permission, Flow subcomponent, or related dependency.

BetterOrgBrowser is intended to help with:

- Tree-based exploration of Salesforce metadata.
- Granular selection of nested metadata components.
- Package.xml generation from selected items.
- One-click sync of selected Permission Set entries into local Permission Set XML.
- Optional dependency inclusion.
- Future dependency and impact analysis.
- Faster workflows in very large Salesforce orgs.

## MVP vision

The first working version focuses on a narrow but valuable slice:

1. Add a VS Code sidebar view named **Better Org Browser**.
2. Select and persist a Salesforce org from locally authorized Salesforce CLI orgs.
3. Display live metadata categories.
4. Expand common metadata types such as objects, fields, Apex classes, flows, and permission sets.
5. Allow selecting metadata nodes for retrieval.
6. Generate a `package.xml` from selected items.
7. Retrieve metadata from a generated manifest.
8. Browse remote Permission Set internals and sync selected entries into the local working copy.

## Current project status

The extension currently has a working end-to-end MVP flow in the VS Code Extension Development Host.

Confirmed working:

- Salesforce org picker.
- Persisted selected org.
- Live browsing for Apex Classes, Flows, Custom Objects, Object Fields, and Permission Sets.
- Field details inspection.
- Copy API Name.
- Add/Remove/Clear/Show Manifest Selections.
- Persisted manifest selections.
- Preview and write `manifest/package.xml`.
- Retrieve Manifest with a friendly summary.
- Salesforce CLI output logging.
- Permission Set deep browser shell.
- Parsed Permission Set Object Permissions.
- Parsed Permission Set Field Permissions.
- Inline Sync Field Permission Entry command.

The most important differentiator currently working is:

```text
Git has a trimmed Permission Set
→ org has the full Permission Set
→ browse remote Field Permissions
→ click sync on one field permission
→ local Permission Set XML receives only that one fieldPermissions block
```

This keeps Git diffs small and avoids manually copying Permission Set XML from a full retrieve.

## Known follow-up items

- Synced Field Permission entries currently append near the bottom before the closing PermissionSet tag; later they should be inserted in sorted/stable order with existing field permissions.
- Object Permission sync should be added using the same pattern.
- `extension.ts` should be modularized into smaller command/service files.
- Remote Permission Set XML should be cached during a session to avoid repeated retrieves.
- More Permission Set folders should be parsed: Apex Class Access, Flow Access, Custom Permissions, Tab Settings, and User Permissions.

## Getting started

Clone the repo:

```bash
git clone https://github.com/djlasher/BetterOrgBrowser.git
cd BetterOrgBrowser
```

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Open in VS Code:

```bash
code .
```

Then press `F5` to launch the Extension Development Host.

Open the Activity Bar view named **Better Org Browser**.

## Suggested local prerequisites

Install and authenticate with Salesforce CLI:

```bash
sf org login web --alias my-dev-org
sf org list
```

For retrieve and Permission Set sync testing, open a separate Salesforce DX project in the Extension Development Host. Keep this extension repo as a VS Code extension repo, not an SFDX project.

## Folder structure

```text
.
├── .vscode/                    # VS Code launch/tasks config
├── docs/
│   ├── ROADMAP.md              # Project roadmap and next priorities
│   └── SESSION_NOTES.md        # Current state for resuming work
├── src/
│   ├── extension.ts            # Extension activation and command registration
│   ├── metadata/
│   │   ├── metadataNode.ts     # Tree node model
│   │   └── metadataProvider.ts # Tree data provider
│   ├── packageXml/
│   │   ├── manifestSelectionStore.ts
│   │   └── packageXmlBuilder.ts
│   └── salesforce/
│       ├── orgService.ts
│       ├── permissionSetParser.ts
│       ├── retrieveResultFormatter.ts
│       └── selectedOrgStore.ts
├── package.json                # VS Code extension manifest
├── tsconfig.json               # TypeScript compiler config
└── README.md
```

## Development notes

This extension is intentionally being built in TypeScript because VS Code extensions are Node-based and the official VS Code extension API is TypeScript-friendly.

Recommended next implementation steps:

1. Add sorted/stable insertion for synced Field Permission entries.
2. Add Sync Object Permission Entry.
3. Refactor `extension.ts` into smaller modules.
4. Add remote Permission Set XML caching.
5. Fill more Permission Set folders.
6. Add right-click and inline commands for selected metadata retrieval.

## License

No license has been selected yet.
