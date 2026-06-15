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

Permission Sets load from the org and are expandable.

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

Remote Permission Set XML is cached for the current Extension Development Host session by selected org and Permission Set API name. The cache is cleared when the org changes or the Better Org Browser tree is refreshed.

### Permission Entry Sync

The major differentiator now supports Field Permission and Object Permission sync:

```text
Remote full Permission Set
→ browse Field Permissions or Object Permissions
→ click inline cloud-download on one permission entry
→ insert/replace only that selected XML block in the local truncated Permission Set XML
```

Confirmed working:

- Field Permissions browse remote entries.
- Object Permissions browse remote entries.
- Inline cloud-download command appears on `PermissionSetFieldPermission` rows.
- Inline cloud-download command appears on `PermissionSetObjectPermission` rows.
- Sync Field Permission Entry retrieves remote metadata format XML using:

```bash
sf project retrieve start --metadata PermissionSet:<name> --target-org <org> --single-package --target-metadata-dir <temp> --unzip
```

- The selected remote `<fieldPermissions>` block is merged into the local source-format Permission Set file.
- The selected remote `<objectPermissions>` block is merged into the local source-format Permission Set file.
- Synced Permission Set blocks use canonical 4-space XML formatting.
- Sync updates already-open editor documents safely instead of only writing to disk behind the editor.
- Field Permission blocks are sorted by field name.
- Object Permission blocks are sorted by object name.
- Field Permission blocks are placed before Object Permission and Tab Setting sections.
- Object Permission blocks are placed before Tab Setting sections.
- This avoids retrieving the whole Permission Set into the working copy and preserves a small Git diff.

### Latest QA Results

Validated in the Extension Development Host:

- Existing Field Permission sync: passed.
- New Field Permission sync after existing field: passed.
- Repeating the same new Field Permission sync: passed.
- Closing and reopening the Permission Set XML tab preserves saved changes: passed.
- Sync after restarting the F5 Extension Development Host: passed.
- Object Permission sync after fields exist: passed.
- Field Permission sync after object permission exists: passed for both new and existing fields.
- Dirty/open editor formatting correction: passed; syncing a permission can normalize manually bad indentation.

New issue found:

- Show Manifest Selections opens an editable temporary document. If Clear Manifest Selections is clicked while that preview is open, the preview does not update. Closing the preview can show a save prompt. Reopening Show Manifest Selections correctly reports that the manifest selection store is empty.

## Important Files

```text
src/extension.ts
src/metadata/metadataNode.ts
src/metadata/metadataProvider.ts
src/packageXml/packageXmlBuilder.ts
src/packageXml/manifestSelectionStore.ts
src/salesforce/orgService.ts
src/salesforce/permissionSetMerge.ts
src/salesforce/permissionSetParser.ts
src/salesforce/retrieveResultFormatter.ts
src/salesforce/selectedOrgStore.ts
src/workspace/textFile.ts
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

Known UX issue:

- Show Manifest Selections currently opens an editable preview document. Clearing selections does not update an already-open preview, and the preview may ask to save on close.

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
- Permission Set browsing retrieves remote XML only; no deploy behavior has been added.

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
9. For Permission Set sync testing, remove a field or object permission block locally, browse the remote permission set, and click the inline sync button for that permission entry.
10. For caching validation, expand Object Permissions then Field Permissions for the same Permission Set; second expansion should use cached XML. Refresh should clear the cache.

## Known Limitations

- `extension.ts` is becoming large and should be modularized.
- Apex Class Access, Flow Access, Custom Permissions, Tab Settings, and User Permissions folders are placeholder shells.
- No dependency analysis yet.
- Large org performance still needs broader caching beyond Permission Set XML.
- No dedicated Manifest Selections tree section yet.
- No selected-state indicator on metadata nodes.
- Manifest preview UX needs cleanup.
- Package/menu contribution rules need cleanup after toolbar and inline command additions.

## Immediate Next Priorities

1. Fix Manifest Selection preview UX and clear-selection feedback.
2. Modularize `extension.ts` into command modules/services.
3. Add visible cache hit/miss logging for remote Permission Set XML.
4. Fill Apex Class Access / Flow Access / Custom Permissions / Tab Settings / User Permissions.
5. Add richer Custom Object drilldown.
6. Add broader caching and large-org performance improvements.
7. Add dependency awareness.

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

And the key product differentiator has working Field Permission and Object Permission sync:

```text
Git has a truncated Permission Set
→ remote org has full Permission Set
→ developer browses remote Permission Set entries
→ one-click syncs only the selected permission entry
→ local file gets a tiny focused XML change
```

Next sessions should focus on:

```text
Manifest UX cleanup
→ modularization
→ cache logging
→ more Permission Set folders
→ richer Custom Object drilldown
→ broader caching
→ dependency awareness
→ enterprise-scale performance
```
