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

The opt-in `test:host` suite exercises a real Windows Extension Development Host and authenticated developer org using disposable local source. Continue coverage on another desktop platform and orgs with metadata absent from this developer org. Use TEST_PLAN.md for interactive QuickPick, cancellation, source-conflict and visual checks beyond the automated host suite.

## Next improvements

- More Flow connectors/conditions and type-specific semantic child sections.
- Worker-based parsing and bounded cache memory for exceptionally large metadata components.
- Better upstream list-limit diagnostics and cancellation of queued/running CLI requests.
- Expanded Profile completeness guidance and folder edge cases (private and nested folders).
- Optional scoped descendant search and visible manifest selection badges.
- Extend the real-host automation to additional org shapes and desktop platforms.

No deploy, backend, telemetry, custom OAuth or webview migration is planned for this work.
