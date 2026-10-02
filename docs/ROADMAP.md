# Roadmap

## Implemented in the deep-browser pass

- Native type-grouped metadata registry with broad listing coverage.
- Semantic CustomObject, PermissionSet, Profile, Flow, Layout, FlexiPage, application, label, custom metadata record, PermissionSetGroup and bundle drilldowns.
- Hierarchy-aware paths, explicit independent manifest membership, and scoped QuickPick search/reveal.
- Current-selection retrieval with a temporary manifest.
- Twelve Permission Set section parsers and single-entry sync, retaining legacy field/object command IDs.
- Command modules, shared CLI service, promise caches, process concurrency limit, disposable output and preview providers.
- Readonly manifest previews, editor-aware writes, project package-directory discovery, automatic temporary-directory cleanup.
- Strict TypeScript compilation and focused Node tests.

## Release gate

Run the manual Extension Development Host matrix in TEST_PLAN.md against authorized sandbox orgs on Windows and another desktop platform. Confirm actual Metadata API responses for all added roots, folder access, Custom Labels, Profile filtering, permission-entry sync, and CLI source conflict behavior. Automated tests are not a substitute for this gate.

## Next improvements

- More Flow connectors/conditions and type-specific semantic child sections.
- Worker-based parsing and bounded cache memory for exceptionally large metadata components.
- Better upstream list-limit diagnostics and cancellation of queued/running CLI requests.
- Expanded Profile completeness guidance and folder edge cases (private and nested folders).
- Optional scoped descendant search and visible manifest selection badges.
- Extension-host automation and packaged VSIX smoke tests.

No deploy, backend, telemetry, custom OAuth or webview migration is planned for this work.
