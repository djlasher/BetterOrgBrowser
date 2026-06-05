# BetterOrgBrowser

A VS Code extension concept for a more granular Salesforce org browser.

The goal is to make Salesforce metadata exploration and retrieval feel closer to a purpose-built developer tool than a flat metadata list. Instead of only browsing broad metadata types, BetterOrgBrowser is intended to let developers drill into nested metadata, select exactly what they need, and eventually generate deployment/retrieval manifests with better dependency awareness.

## Why this exists

Salesforce orgs get huge. Standard org browsing tools are useful, but they can become slow or too coarse when you only need a specific field, permission, Flow subcomponent, or related dependency.

BetterOrgBrowser is intended to help with:

- Tree-based exploration of Salesforce metadata.
- Granular selection of nested metadata components.
- Package.xml generation from selected items.
- Optional dependency inclusion.
- Future dependency and impact analysis.
- Faster workflows in very large Salesforce orgs.

## MVP vision

The first working version should focus on a narrow but valuable slice:

1. Add a VS Code sidebar view named **Better Org Browser**.
2. Detect the currently authorized Salesforce org from the local Salesforce CLI project context.
3. Display top-level metadata categories.
4. Expand common metadata types such as objects, fields, Apex classes, flows, and permission sets.
5. Allow selecting metadata nodes for retrieval.
6. Generate a `package.xml` from selected items.

## Stretch goals

- Include dependencies automatically or on demand.
- Compare selected metadata against the local project.
- Build package.xml files from saved selection sets.
- Add permission set drilldown for object, field, class, Apex, Flow, and custom permission access.
- Add object-level drilldown for fields, validation rules, record types, compact layouts, list views, and field sets.
- Add Flow dependency visualization.
- Add org-size-aware caching for giant enterprise orgs.

## Current project status

This repo currently contains the initial TypeScript VS Code extension scaffold.

The extension activates, registers a sidebar tree view, and displays placeholder metadata nodes so the project can be opened and run immediately in the VS Code Extension Development Host.

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

For the future Salesforce integration work, install and authenticate with Salesforce CLI:

```bash
sf org login web --alias my-dev-org
sf org list
```

The current scaffold does not call Salesforce CLI yet.

## Folder structure

```text
.
├── .vscode/                 # VS Code launch/tasks config
├── src/
│   ├── extension.ts          # Extension activation entry point
│   ├── metadata/
│   │   ├── metadataNode.ts   # Tree node model
│   │   └── metadataProvider.ts # Tree data provider
│   └── salesforce/
│       └── orgService.ts     # Future Salesforce CLI / Metadata API wrapper
├── package.json              # VS Code extension manifest
├── tsconfig.json             # TypeScript compiler config
└── README.md
```

## Development notes

This extension is intentionally being built in TypeScript because VS Code extensions are Node-based and the official VS Code extension API is TypeScript-friendly.

Recommended next implementation steps:

1. Add a Salesforce CLI wrapper that can call `sf org display --json`.
2. Add an org picker command.
3. Cache metadata describe/list results locally.
4. Replace placeholder tree nodes with real metadata type results.
5. Add right-click commands for `Retrieve`, `Add to package.xml`, and `Copy metadata name`.

## License

No license has been selected yet.
