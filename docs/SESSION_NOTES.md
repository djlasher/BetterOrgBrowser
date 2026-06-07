# BetterOrgBrowser Session Notes

## Purpose

BetterOrgBrowser is a TypeScript VS Code extension intended to become a granular Salesforce metadata explorer, retrieval helper, and dependency assistant for VS Code.

Core workflow target:

```text
Browse metadata
→ inspect metadata
→ select exact components
→ generate package.xml
→ retrieve metadata
→ eventually analyze dependencies
```

## Current Working State

The extension is functional and tested locally through the VS Code Extension Development Host.

### Confirmed Working

- VS Code extension scaffold in TypeScript.
- Better Org Browser activity bar container.
- Metadata Explorer tree view.
- Salesforce CLI integration.
- Windows `sf.cmd` compatibility.
- Salesforce org picker.
- Persisted selected org across reloads.
- Live metadata browsing:
  - Apex Classes
  - Flows
  - Custom Objects
  - Object Fields
- Dynamic field drilldown from `sf sobject describe`.
- Right-click Show Field Details.
- Right-click Copy API Name.
- Add to Manifest.
- Remove from Manifest.
- Show Manifest Selections.
- Clear Manifest Selections.
- Manifest persistence across reloads.
- package.xml generation.
- Preview Manifest.
- Write Manifest to File.
- Retrieve Manifest.
- Status bar manifest selection count.
- Clickable manifest status bar shortcut.

## Important Files

```text
src/extension.ts
src/metadata/metadataNode.ts
src/metadata/metadataProvider.ts
src/packageXml/packageXmlBuilder.ts
src/packageXml/manifestSelectionStore.ts
src/salesforce/orgService.ts
src/salesforce/selectedOrgStore.ts
package.json
```

## Current Tree Shape

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

Permission Sets are still placeholder-only.

## Current Manifest UX

Manifest selections now support:

- Add
- Remove
- Clear
- Show
- Persist across reloads
- Live status bar count

Status bar example:

```text
Manifest: 3
```

Clicking the status bar opens Show Manifest Selections.

## Retrieve Command

Current retrieve command:

```bash
sf project retrieve start --manifest manifest/package.xml --target-org <selected-org> --json
```

Retrieve works successfully in a separate SFDX project.

The extension repo itself should remain a VS Code extension repo and should not become an SFDX project.

## Development Workflow

### Compile

```bash
npm install
npm run compile
```

### Run Extension

```text
Press F5 in VS Code
```

### Recommended Test Pattern

1. Open BetterOrgBrowser extension repo.
2. Press F5.
3. In Extension Development Host, open separate SFDX test project.
4. Select Salesforce org.
5. Browse metadata.
6. Add items to manifest.
7. Write manifest.
8. Retrieve manifest.

## Known Limitations

- `extension.ts` is becoming large and should be modularized.
- Retrieve output still displays raw JSON.
- Permission Sets are placeholder-only.
- No dependency analysis yet.
- No caching yet.
- Large org performance not optimized yet.
- No dedicated Manifest Selections tree section yet.
- No selected-state indicator on metadata nodes.

## Immediate Next Priorities

1. Improve retrieve result formatting.
2. Add output channel logging.
3. Begin Permission Set implementation.
4. Refactor `extension.ts` into smaller modules.
5. Add richer Custom Object drilldown.
6. Add caching and large-org performance improvements.

## Mental Model For Next Session

The MVP workflow is proven end-to-end:

```text
VS Code Extension
→ Salesforce CLI
→ browse org metadata
→ inspect metadata
→ select metadata
→ generate package.xml
→ write manifest/package.xml
→ retrieve metadata into SFDX project
```

Next sessions should focus on:

```text
better UX
→ better retrieve output
→ more metadata types
→ dependency awareness
→ enterprise-scale performance
```
