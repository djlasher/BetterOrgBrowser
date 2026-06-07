# BetterOrgBrowser Session Notes

## Purpose

BetterOrgBrowser is a TypeScript VS Code extension intended to become a granular Salesforce metadata explorer, retrieval helper, permission-set patcher, and dependency assistant for VS Code.

Core workflow target:

```text
Browse metadata
→ inspect metadata
→ select exact components or permission entries
→ generate package.xml or sync one permission entry
→ retrieve/patch metadata
→ eventually analyze dependencies
```

## Current Working State

The extension is functional and tested locally through the VS Code Extension Development Host.

### Confirmed Working

- VS Code extension scaffold in TypeScript.
- Better Org Browser activity bar container.
- Metadata Explorer tree view.
- Salesforce CLI integration.
- Windows CLI execution with quoted command logging.
- Dedicated Salesforce CLI output channel: **Better Org Browser Salesforce CLI**.
- Salesforce org picker.
- Persisted selected org across reloads.
- Live metadata browsing:
  - Apex Classes
  - Flows
  - Custom Objects
  - Object Fields
  - Permission Sets
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
- Friendly retrieve summary for manifest retrieves.
- Retrieve output channel logging.
- Status bar manifest selection count.
- Clickable manifest status bar shortcut.

### Permission Set Deep Browser

Permission Sets now load from the org and are expandable.

Current tree shape:

```text
Permission Sets
└── Claygentforce_Support_Manager
    ├── Object Permissions
    │   └── Case
    │       ├── Read: Yes
    │       ├── Create: Yes
    │       ├── Edit: Yes
    │       ├── Delete: No
    │       ├── View All Records: No
    │       └── Modify All Records: No
    ├── Field Permissions
    │   └── Case.High_Risk_Override__c
    │       ├── Readable: Yes
    │       └── Editable: Yes
    ├── Apex Class Access
    ├── Flow Access
    ├── Custom Permissions
    ├── Tab Settings
    └── User Permissions
```

Object Permissions and Field Permissions are parsed from remote Permission Set XML retrieved into a temporary metadata-format folder under the SFDX test project. Browsing Permission Set internals should not mutate the local working copy.

### Permission Entry Sync

The major differentiator now has a first working slice:

```text
Remote full Permission Set
→ browse Field Permissions
→ click inline cloud-download on one field permission
→ insert/replace only that <fieldPermissions> block in the local truncated Permission Set XML
```

Confirmed working:

- Field Permissions browse remote entries.
- Inline cloud-download command appears on `PermissionSetFieldPermission` rows.
- Sync Field Permission Entry retrieves remote metadata format XML using:

```bash
sf project retrieve start --metadata PermissionSet:<name> --target-org <org> --single-package --target-metadata-dir <temp> --unzip
```

- The selected remote `<fieldPermissions>` block is merged into the local source-format Permission Set file.
- This avoids retrieving the whole Permission Set into the working copy and preserves a small Git diff.

Known behavior to improve later:

- Synced `<fieldPermissions>` entries are currently inserted at the bottom before `</PermissionSet>`.
- Later we should insert entries in a sorted/stable location among existing `<fieldPermissions>` blocks.

## Important Files

```text
src/extension.ts
src/metadata/metadataNode.ts
src/metadata/metadataProvider.ts
src/packageXml/packageXmlBuilder.ts
src/packageXml/manifestSelectionStore.ts
src/salesforce/orgService.ts
src/salesforce/permissionSetParser.ts
src/salesforce/retrieveResultFormatter.ts
src/salesforce/selectedOrgStore.ts
package.json
```

## Current Manifest UX

Manifest selections support:

- Add
- Remove
- Clear
- Show
- Persist across reloads
- Live status bar count
- Preview package.xml
- Write `manifest/package.xml`
- Retrieve manifest

Status bar example:

```text
Manifest: 3
```

Clicking the status bar opens Show Manifest Selections.

## Retrieve Commands

Manifest retrieve:

```bash
sf project retrieve start --manifest manifest/package.xml --target-org <selected-org> --json
```

Permission Set remote XML browse/sync retrieve:

```bash
sf project retrieve start --metadata PermissionSet:<PermissionSetName> --target-org <selected-org> --single-package --target-metadata-dir <temp-folder> --unzip
```

Important notes:

- Metadata-format Permission Set retrieve must not use `--json` in this environment because that combo caused a Salesforce CLI crash.
- Windows paths with spaces required switching command execution to a quoted `exec(...)` command path on Windows.
- The extension repo itself should remain a VS Code extension repo and should not become an SFDX project.

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
9. For Permission Set sync testing, remove a field permission block locally, browse the remote permission set, and click the inline sync button for that field permission.

## Known Limitations

- `extension.ts` is becoming large and should be modularized.
- Permission Set sync currently supports Field Permissions only.
- Synced Field Permission blocks are appended near the bottom rather than sorted into the existing field permission section.
- Object Permission sync is not implemented yet.
- Apex Class Access, Flow Access, Custom Permissions, Tab Settings, and User Permissions folders are placeholder shells.
- No dependency analysis yet.
- No caching yet.
- Large org performance not optimized yet.
- No dedicated Manifest Selections tree section yet.
- No selected-state indicator on metadata nodes.

## Immediate Next Priorities

1. Add sorted/stable insertion for synced Field Permission blocks.
2. Add Object Permission sync using the same pattern.
3. Modularize `extension.ts` into command modules/services.
4. Add shared remote Permission Set XML cache to avoid repeated retrieves.
5. Fill Apex Class Access / Flow Access / Custom Permissions / Tab Settings / User Permissions.
6. Add richer Custom Object drilldown.
7. Add caching and large-org performance improvements.

## Mental Model For Next Session

The MVP workflow is now more than a metadata browser:

```text
VS Code Extension
→ Salesforce CLI
→ browse org metadata
→ inspect metadata
→ generate package.xml
→ retrieve metadata into SFDX project
```

And the key product differentiator has a working first slice:

```text
Git has a truncated Permission Set
→ remote org has full Permission Set
→ developer browses remote Permission Set entries
→ one-click syncs only the selected permission entry
→ local file gets a tiny focused XML change
```

Next sessions should focus on:

```text
permission-entry sync polish
→ object permission sync
→ modularization
→ caching
→ more metadata types
→ dependency awareness
→ enterprise-scale performance
```
