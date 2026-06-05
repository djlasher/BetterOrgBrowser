# BetterOrgBrowser Session Notes

_Last updated: 2026-06-05_

## Purpose

BetterOrgBrowser is a TypeScript VS Code extension intended to become a more granular Salesforce org browser and retrieval helper.

The core idea is to improve on a flat org browser by letting a developer browse nested metadata, inspect details, select exact components, generate `package.xml`, and eventually retrieve or analyze dependencies directly from VS Code.

## Current working state

The extension is functional and has been tested locally through the VS Code Extension Development Host.

### Confirmed working

- VS Code extension scaffold in TypeScript.
- Activity Bar container named **Better Org Browser**.
- Tree view named **Metadata Explorer**.
- Salesforce CLI integration through Node `child_process.execFile`.
- Windows CLI compatibility using `sf.cmd`.
- Org picker using:

```bash
sf org list --json
```

- Claygentforce Developer Edition org selected successfully.
- Live Apex Class listing using:

```bash
sf org list metadata --metadata-type ApexClass --target-org Claygentforce --json
```

- Live Flow listing using:

```bash
sf org list metadata --metadata-type Flow --target-org Claygentforce --json
```

- Live Custom Object listing using:

```bash
sf org list metadata --metadata-type CustomObject --target-org Claygentforce --json
```

- Object field drilldown using:

```bash
sf sobject describe --sobject Account --target-org Claygentforce --json
```

- Custom Objects expand into object nodes.
- Objects expand into a **Fields** folder.
- Fields load dynamically from `sobject describe`.
- Right-click **Show Field Details** works for field nodes.
- Right-click **Copy API Name** works.
- Right-click **Add to Manifest** works for supported nodes.
- **Preview Manifest** generates an untitled XML document.
- **Write Manifest to File** creates/updates:

```text
manifest/package.xml
```

- **Retrieve Manifest** backend command exists and was exposed. It runs:

```bash
sf project retrieve start --manifest manifest/package.xml --target-org <selected-org> --json
```

- Retrieval was tested successfully in a separate SFDX test project. The extension repo itself should remain a VS Code extension project, not an SFDX project.

## Tested successful retrieve output

A generated manifest successfully retrieved:

- `Account.Active__c` as `CustomField`
- `Account` as `CustomObject`
- `devedapp__DeveloperEditionUtilsTest` as `ApexClass`

Example retrieved paths:

```text
force-app/main/default/objects/Account/fields/Active__c.field-meta.xml
force-app/main/default/objects/Account/Account.object-meta.xml
force-app/main/default/classes/devedapp__DeveloperEditionUtilsTest.cls
force-app/main/default/classes/devedapp__DeveloperEditionUtilsTest.cls-meta.xml
```

## Important implementation details

### Key files

```text
src/extension.ts
src/metadata/metadataNode.ts
src/metadata/metadataProvider.ts
src/salesforce/orgService.ts
src/packageXml/packageXmlBuilder.ts
package.json
```

### `OrgService`

`OrgService` handles Salesforce CLI calls.

Important methods:

- `listAuthorizedOrgs()`
- `listMetadata(targetOrg, metadataType)`
- `listApexClasses(targetOrg)`
- `listFlows(targetOrg)`
- `listCustomObjects(targetOrg)`
- `describeSObject(targetOrg, objectApiName)`
- `retrieveManifest(targetOrg, manifestPath, cwd)`

The command runner uses:

```ts
process.platform === 'win32' ? 'sf.cmd' : 'sf'
```

and passes `shell: process.platform === 'win32'`.

### `MetadataNode`

`MetadataNode` now stores:

- `label`
- `metadataType`
- `apiName`
- `parentApiName`
- `fieldDetails`
- `packageXmlType`

`contextValue` is currently set to `metadataType`, which means field context menu visibility depends on Salesforce field type values such as `string`, `picklist`, `reference`, etc.

### `MetadataProvider`

The tree currently supports:

```text
Connected Org: <selected org>
Custom Objects
  <ObjectApiName>
    Fields
      <FieldApiName>
Apex Classes
  <ClassName>
Flows
  <FlowName>
Permission Sets
```

Permission Sets are still placeholder-only.

### `PackageXmlBuilder`

`PackageXmlBuilder` keeps an in-memory map:

```ts
Map<string, Set<string>>
```

It groups selected metadata by package.xml type and generates XML like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>Account.Active__c</members>
        <name>CustomField</name>
    </types>
    <version>66.0</version>
</Package>
```

## Current UX limitations / known issues

- Command Palette does not pass selected tree items, so node-specific commands only reliably work from right-click context menus.
- **Show Field Details** should be considered right-click only.
- **Copy API Name** should be considered right-click only.
- **Add to Manifest** should be considered right-click only.
- Manifest selections are in-memory only and reset when the extension host reloads.
- There is no visible selection bucket yet.
- There is no clear manifest selection command yet.
- There is no remove-from-manifest command yet.
- There is no manifest count display in the tree yet.
- Retrieve output currently opens raw JSON in a new editor tab.
- Error handling is basic.
- No caching yet. Large orgs may be slow.
- Custom Object drilldown currently only shows Fields.
- Field metadata shown is basic; more describe properties are available.
- No dependency analysis yet.
- No package.xml write confirmation overwrite choice yet.
- No support yet for profiles, permission sets, LWCs, tabs, FlexiPages, layouts, validation rules, record types, list views, or field sets.

## Development commands

From the extension repo:

```bash
npm install
npm run compile
```

Run extension locally:

```text
Press F5 in VS Code
```

In Extension Development Host:

```text
Better Org Browser: Select Salesforce Org
Better Org Browser: Preview Manifest
Better Org Browser: Write Manifest to File
Better Org Browser: Retrieve Manifest
```

Manual retrieve equivalent:

```bash
sf project retrieve start --manifest manifest/package.xml --target-org Claygentforce
```

## Test setup notes

The correct pattern is:

1. Open the BetterOrgBrowser extension repo in VS Code.
2. Press `F5` to launch Extension Development Host.
3. In the Extension Development Host, open a separate SFDX project folder such as `BetterOrgBrowserTest`.
4. Use BetterOrgBrowser in that SFDX project window.
5. Generate/write `manifest/package.xml` there.
6. Run Retrieve Manifest from the extension or run the equivalent CLI command.

Do not convert the extension repo itself into an SFDX project.

## Next best steps

1. Add **Clear Manifest Selections** command.
2. Add **Show Manifest Selections** command or tree node.
3. Add a visible count, such as `Manifest Selections (3)`.
4. Add **Remove from Manifest** for selected nodes.
5. Improve retrieve result display from raw JSON to a readable summary.
6. Add validation for SFDX project context earlier in the workflow.
7. Add caching for metadata list calls.
8. Add Permission Set listing.
9. Add Custom Object subfolders beyond Fields:
   - Record Types
   - Validation Rules
   - Field Sets
   - List Views
   - Compact Layouts
10. Add Retrieve Selected Metadata command that does add-to-manifest, write manifest, and retrieve in one action.

## Current mental model for next session

The MVP has proven the full loop:

```text
VS Code Extension
→ Salesforce CLI
→ browse live org metadata
→ inspect/copy/select exact metadata
→ generate package.xml
→ write manifest/package.xml
→ retrieve metadata into SFDX project
```

The next session should focus on making the manifest selection workflow easier to use and less invisible.
