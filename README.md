# BetterOrgBrowser

A native VS Code Salesforce metadata tree that keeps drilling into meaningful metadata children. Browse, select valid package members, retrieve source, and sync one remote Permission Set entry into a trimmed local file.

## Getting started

```sh
npm ci
npm run compile
npm test
```

Open this extension repository in VS Code and press F5. In the Extension Development Host, open a **separate Salesforce DX project**, then use **Better Org Browser: Select Salesforce Org**. Authenticate beforehand with Salesforce CLI (`sf org login web`). This repository is not an SFDX project.

With no selected org, the browser shows a **Select Salesforce Org** welcome button. After selection, a notification confirms the choice; the selected org stays visible above the metadata tree and in a clickable status-bar indicator. Restored selections show the same persistent indicators after reload.

## Browsing

Metadata is grouped by type in a native TreeView, with top-level categories alphabetized by their displayed names. Roots load on expansion, and component XML is retrieved only when a component is expanded. Right-click **Inspect Metadata** for details or a bundle file preview. **Copy Full Metadata Path** preserves semantic ancestors, for example:

```text
CustomObject: Account > ValidationRule: Require_Industry
PermissionSet: Sales_User > ApexClassAccess: MyController
Flow: Automation > Screen: Customer_Details > Component: Email
```

Implemented roots and depth:

| Metadata | Browsing |
| --- | --- |
| CustomObject | Describe-backed Fields; retrieved Record Types, Validation Rules, Field Sets, List Views, Compact Layouts, Web Links, Business Processes, Sharing Reasons, Indexes; inspectable Search Layouts |
| Flow | Variables, constants, formulas, screens and nested components, decisions and rules, assignments, loops, record operations, subflows, actions, waits/events, collection processors, transforms, start configuration |
| PermissionSet | Object/field permissions, Apex class access, Flow access, custom permissions, tabs, user permissions, record types, pages, applications, custom metadata types, external data sources; values and single-entry sync |
| Profile | Available permission sections and tab visibilities; browse only, no entry sync |
| LightningComponentBundle / AuraDefinitionBundle | Files returned by Salesforce, including nested file paths; inspectable source |
| Layout | Sections, columns, items, related lists |
| FlexiPage | Regions and component/field instances |
| PermissionSetGroup | Referenced Permission Sets, selectable as PermissionSet members |
| CustomApplication | Tabs |
| CustomLabels | Aggregate retrieval followed by individual CustomLabel entries |
| CustomMetadata | Records and field values |
| Report / Dashboard / EmailTemplate | Folder-aware component listing |
| ApexClass, ApexTrigger, CustomTab, StaticResource, Queue, Group, NamedCredential, ExternalCredential, AuthProvider, ConnectedApp, RemoteSiteSetting, CustomPermission | Component listing and manifest selection |

Custom metadata type definitions (`__mdt`) appear under Custom Objects; their records appear under Custom Metadata Records. Empty optional XML sections are omitted. Unsupported or inaccessible metadata produces a local error row rather than disabling the browser.

## Select, retrieve, and sync

- **Add / Remove from Manifest**, **Clear / Show Manifest Selections**, **Preview Manifest**, **Write Manifest to File**, and the persisted status bar count remain available.
- **Retrieve Metadata** is the inline cloud-download button on each independently retrievable component, including whole objects, individual custom fields, object child metadata, labels, bundles, and metadata folders. It retrieves only the clicked member into your SFDX project without changing manifest selections. Informational rows remain inspect-only.
- **Retrieve Selected Metadata** uses the current selections through a temporary manifest and retrieves into the selected SFDX project using normal CLI source behavior. It does not replace `manifest/package.xml`.
- **Retrieve Manifest** retrieves the existing project manifest. Retrieval summaries and detailed CLI output remain available.
- **Sync Permission Set Entry** appears inline on supported permission entries. Field/Object sync command IDs remain registered for compatibility. The full remote Permission Set is cached outside the source tree; only the chosen entry is merged into an existing local Permission Set. Package directories come from `sfdx-project.json`; multiple matching files prompt for a target. Open documents are edited and saved through VS Code.
- **Search Metadata** is a staged QuickPick: choose/filter a type, then a component or folder, then deeper children. Selection reveals the node. It does not crawl the entire org.

Browsable does not imply independently retrievable. Flow screens, layout items, record values, indexes, permission entries, and bundle files cannot be added to the manifest here. Select their containing component instead. Describe fields remain inspectable; only custom fields or fields also returned in CustomObject metadata receive manifest actions.

Syncing a Permission Set entry also regroups and alphabetically sorts its local section. Re-syncing a field moved to the bottom restores its position and removes leftover blank lines between top-level entries. Other entries keep their local values; comments and whitespace inside values remain intact.

## Architecture and caching

`extension.ts` wires services and command modules. The declarative registry controls metadata roots and parser selection. Pure semantic parsers and the node model are separate from VS Code rendering. `OrgService` owns all CLI execution, including Windows `sf.cmd` support, logs, process timeout/buffer limits, and a three-process concurrency limit.

Promise caches coalesce metadata lists, describes, and component retrievals by org/type/member. **Refresh** and org changes invalidate the session caches; failed requests can retry. Cache HIT/MISS/STORE messages appear in **Better Org Browser Cache**. Metadata-format retrieval uses unique OS temporary directories removed in `finally`, including on failure. Browsing does not retrieve metadata into project source.

## Validation and limitations

`npm test` compiles and runs Node unit/integration tests without launching VS Code. Tests cover manifests, paths, semantic XML parsing, minimal Permission Set merges, concurrency/cache races, and tree behavior. `npm run test:host` runs opt-in live tests in a real VS Code extension host against `BOB_TEST_ORG`, using an automatically removed temporary SFDX project. See [validation instructions](docs/TEST_PLAN.md).

- Live org availability, permissions, API versions, managed packages, and Metadata API list limits affect results. Listing has no pagination beyond the CLI response; very large types may be truncated upstream.
- Profile/Permission Set XML can be incomplete because Salesforce filters permissions by retrieved metadata and access. This browser displays what the API returns; it never claims an omitted permission is false.
- Layout, FlexiPage, application and Flow browsing exposes the semantic sections listed above, not every Salesforce XML feature. Remaining details are inspectable JSON. Screen nesting is bounded at 16 levels.
- Search is scoped to the selected type/branch, not a global recursive index. There is no dependency analysis or deploy functionality.
- XML parsing is synchronous per retrieved component. Very large individual XML files can briefly occupy the extension host; a worker parser remains future work. Caches last until refresh, org change, or session end.
- CLI processes time out after ten minutes; there is no interactive cancellation. `cross-spawn` handles platform escaping, including percent-encoded layout names and literal shell punctuation. Embedded double quotes on Windows and control characters are rejected.
- A supported desktop Node extension host and installed Salesforce CLI are required. Live checks cover the available developer-org metadata on Windows; empty metadata types and other desktop operating systems need additional environment coverage.

## License

No license has been selected yet.
