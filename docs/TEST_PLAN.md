# Validation

## Automated

```sh
npm ci
npm run compile
npm test
git diff --check
```

Tests cover package ordering/escaping/persistence, hierarchy paths, member derivation, XML singleton/array/namespace/entity handling, semantic parsers, merge idempotence/CRLF/comments/key validation, caches/concurrency, provider parents, folder listing, bundle granularity, stale-org results and retryable failures.

## Opt-in live extension-host suite

For the org feedback and Permission Set ordering regressions, run `npm run test:host:regressions`. This uses a real isolated VS Code host and disposable project, with remote XML supplied by a fixture. It needs no Salesforce login. Unit coverage also checks org selection, cancellation, restoration, notification behavior, sorting and LF/CRLF preservation.

On Windows PowerShell, with VS Code and Salesforce CLI installed:

```powershell
$env:BOB_TEST_ORG = 'your-test-org-alias'
npm run test:host
```

The runner discovers `code.cmd` on Windows. On another platform, set `CODE_EXECUTABLE` to the actual VS Code desktop executable. Optional `BOB_TEST_API_VERSION` selects the temporary project's version (default 66.0); `BOB_TEST_REPORT` saves the JSON report outside the automatically removed test workspace.

This test uses authenticated read-only Salesforce calls, not deployment. It creates a fresh SFDX project with a path containing spaces and an isolated VS Code profile; it retrieves a Flow and writes trimmed Permission Set files only there. It tests all registry roots, available semantic components, folder loading, manifest preview/current-selection retrieval, clipboard paths, actual dirty-editor sync, idempotence and refresh. Available Field/Object/Tab sections were exercised in the developer org; the remaining sections are covered with synthetic fixtures. The test needs a readable Account, Flow and Permission Set to exercise its core workflows. Empty types are explicitly reported as unavailable, not verified content.

## Additional manual matrix

Use F5 and open a separate SFDX sandbox project in the Extension Development Host. Keep a clean git baseline to review source changes. Repeat CLI-sensitive checks on Windows with a project path containing spaces and on another desktop OS.

1. Pick an authenticated org. Reload; verify org and selections persist. Browse multiple roots and confirm lazy CLI calls.
2. Expand Account: Fields and available metadata sections. Inspect a field, copy API name/path, select a validation rule/record type/custom field, preview package.xml, verify exact `Object.Child` members.
3. Expand a Flow: Screen → Components (including nested sections), Decision → Rules, variables/actions/start. Confirm details and API names; no child Add to Manifest action.
4. Expand a Permission Set with each of the twelve documented sections. Check true/false values, labels and full paths. Expand Profile and verify no sync actions.
5. Sync an existing and a missing field permission, object permission, Apex class access and other available sections into trimmed local XML. Confirm tiny diffs, escaped values, sorted insertion and idempotence. Repeat with CRLF and open dirty editor; check saved file and no duplicate blocks. Test multiple package directories and two matching target files.
6. Open LWC and Aura bundles; inspect files/nested paths. Only the bundle has a manifest action. Verify actual files returned by the CLI.
7. Browse Custom Labels, custom metadata records, Permission Set Groups, Layouts, Lightning Pages and Applications; verify supported child sections and manifest granularity.
8. Browse reports/dashboards/email by folder. Verify member names include folders. Check private/inaccessible folders yield local errors.
9. Add/remove/clear selections; check status count and open readonly previews update without save prompts. Existing manifest replacement must be explicit.
10. Retrieve Selected Metadata without writing a project manifest. Verify source lands in configured package directories and the existing manifest remains unchanged. Run Retrieve Manifest separately; verify both success and failure summaries. Test source conflicts.
11. Search a type, component and deep branch using QuickPick. Confirm reveal selects the correct node; cancel at each stage.
12. Inspect **Better Org Browser Cache** HIT/MISS/STORE logs. Refresh and change org; verify fresh requests and no late prior-org rows. Rapidly expand roots to exercise the three-process limit.
13. Trigger failed metadata retrieval and retry; verify other roots remain usable. Compare source git diff after browsing: no source changes. Confirm OS temp directories are removed after successful and failed requests.
14. Test large org types/objects and document upstream list truncation, UI responsiveness and memory. The parser remains synchronous for each component.

No deployment commands should be contributed or executed.
