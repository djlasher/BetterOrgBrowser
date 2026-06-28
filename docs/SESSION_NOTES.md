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
- Right-click Copy Full Metadata Path.
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

### Manifest Selection UX

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

The Show Manifest Selections command now uses a readonly virtual document provider instead of an editable temporary Markdown document.

Confirmed behavior:

- The manifest selections preview no longer prompts to save on close.
- An already-open manifest selections preview updates when selections are added, removed, or cleared.
- Clearing manifest selections updates the persisted store, status bar count, and open preview.

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

### Permission Set Cache Observability

A dedicated output channel exists:

```text
Better Org Browser Permission Set Cache
```

Current cache logging:

```text
[Cache MISS] Retrieving remote Permission Set XML for <PermissionSetName>
[Cache STORE] Cached remote Permission Set XML for <PermissionSetName>
[Cache HIT] Using cached remote Permission Set XML for <PermissionSetName>
Cache cleared by Better Org Browser refresh.
Cache cleared because the selected org changed.
```

Validated behavior:

- Expanding Object Permissions for a Permission Set logs MISS and STORE.
- Expanding Field Permissions for the same Permission Set logs HIT.
- Refresh clears the cache and the next Permission Set expansion logs a fresh MISS.

### Permission Set Loading Feedback

Permission Set XML retrieval now uses VS Code progress feedback during cache misses.

Current behavior:

- A progress bar appears while slow remote Permission Set metadata retrieval is running.
- Cache MISS and STORE are visible in the Permission Set Cache output channel.

Known UX limitation:

- VS Code may show the progress bar without consistently rendering the notification title text.
- This is functional but may need a clearer visible loading affordance later.

### Permission Entry Sync

The major differentiator supports Field Permission and Object Permission sync:

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

### Copy Full Metadata Path

A new context menu command exists:

```text
Better Org Browser: Copy Full Metadata Path
```

Confirmed useful path formats:

```text
CustomObject: Account
CustomField: Account.Name
ApexClass: MyController
Flow: MyFlow
PermissionSet: Sales_User
```

Known issue for next session:

Copy Full Metadata Path is currently node-based instead of hierarchy-aware for nested Permission Set child nodes.

Examples of current incorrect behavior:

```text
Permission Sets > MyPermSet > Object Permissions
→ copies: Object Permissions

Permission Sets > MyPermSet > Object Permissions > Case
→ copies: Case
```

Expected next behavior:

```text
Permission Sets > MyPermSet > Object Permissions
→ PermissionSet: MyPermSet > Object Permissions

Permission Sets > MyPermSet > Object Permissions > Case
→ PermissionSet: MyPermSet > ObjectPermission: Case

Permission Sets > MyPermSet > Field Permissions > Account.Name
→ PermissionSet: MyPermSet > FieldPermission: Account.Name
```

This should likely be the first task next session.

## Latest QA Results

Validated in the Extension Development Host:

- Existing Field Permission sync: passed.
- New Field Permission sync after existing field: passed.
- Repeating the same new Field Permission sync: passed.
- Closing and reopening the Permission Set XML tab preserves saved changes: passed.
- Sync after restarting the F5 Extension Development Host: passed.
- Object Permission sync after fields exist: passed.
- Field Permission sync after object permission exists: passed for both new and existing fields.
- Dirty/open editor formatting correction: passed; syncing a permission can normalize manually bad indentation.
- Manifest selections virtual document: passed.
- Manifest selections clear while preview open: passed.
- Permission Set cache MISS/STORE/HIT logging: passed.
- Permission Set loading progress indicator: functional pass, but notification title text may not consistently display.
- Copy Full Metadata Path command registration and supported top-level metadata paths: passed.

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
docs/DEVLOG.md
docs/KNOWN_ISSUES.md
docs/SESSION_NOTES.md
```

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
11. For Copy Full Metadata Path validation, right-click Custom Object, Field, Apex Class, Flow, Permission Set, and Permission Set child nodes.

## Known Limitations

- Copy Full Metadata Path needs hierarchy-aware behavior for nested Permission Set folders and entries.
- Permission Set progress notification text may not consistently render even though progress is active.
- `extension.ts` is becoming large and should be modularized.
- Apex Class Access, Flow Access, Custom Permissions, Tab Settings, and User Permissions folders are placeholder shells.
- No dependency analysis yet.
- Large org performance still needs broader caching beyond Permission Set XML.
- No dedicated Manifest Selections tree section yet.
- No selected-state indicator on metadata nodes.
- Package/menu contribution rules need cleanup after toolbar and inline command additions.

## Immediate Next Priorities

1. Fix hierarchy-aware Copy Full Metadata Path behavior for Permission Set folders and child permission entries.
2. Improve Permission Set loading indicator UX if needed.
3. Modularize `extension.ts` into command modules/services.
4. Fill Apex Class Access / Flow Access / Custom Permissions / Tab Settings / User Permissions.
5. Add richer Custom Object drilldown.
6. Add broader caching and large-org performance improvements.
7. Add dependency awareness.

## Mental Model For Next Session

Start here:

```text
Fix Copy Full Metadata Path for nested Permission Set nodes.
```

The current command works for top-level metadata, but Permission Set child nodes need richer path construction.

Likely target behavior:

```text
PermissionSet: MyPermSet > Object Permissions
PermissionSet: MyPermSet > ObjectPermission: Case
PermissionSet: MyPermSet > FieldPermission: Account.Name
```

The MVP workflow is now more than a metadata browser:

```text
VS Code Extension
→ Salesforce CLI
→ browse org metadata
→ inspect metadata
→ generate package.xml
→ retrieve metadata into SFDX project
→ patch granular Permission Set entries into local files
```

And the key product differentiator has working Field Permission and Object Permission sync:

```text
Git has a truncated Permission Set
→ remote org has full Permission Set
→ developer browses remote Permission Set entries
→ one-click syncs only the selected permission entry
→ local file gets a tiny focused XML change
```

## Assistant Workflow Reminder

For future BetterOrgBrowser sessions:

1. Inspect the repo before every task.
2. Send full file replacements whenever practical.
3. Chunk large code blocks safely for copy/paste.
4. Provide git commands separately.
5. Provide manual validation steps.
6. After the user sends `k`, verify the branch/commit/file landed in GitHub before sending the next task.
7. User handles code implementation; assistant handles documentation updates at session end.
