# Validation results

Validated on Windows with an authenticated Salesforce Developer Edition org and the real VS Code Extension Development Host. Live test source was written only to disposable SFDX projects with spaces in their paths; no deployments or changes to existing user projects were performed.

## Passed

- TypeScript compilation and 30 automated tests, including an actual Windows `.cmd` argument round-trip test.
- All 27 registered metadata roots listed without errors.
- CustomObject XML and describe-backed fields, detail previews, and hierarchy-aware clipboard paths.
- Flow semantic expansion, valid manifest preview, and Retrieve Selected Metadata writing source without replacing the project manifest.
- Granular Field Permission, Object Permission, and Tab Setting sync into a trimmed Permission Set; dirty-editor content preserved, saved, and repeated sync idempotent.
- Layout retrieval with percent-encoded names; Layout, FlexiPage, CustomApplication, PermissionSetGroup, Profile, and LWC expansion.
- Report, Dashboard and EmailTemplate folder expansion.
- Refresh and subsequent loading.
- VSIX packaging and installation in an isolated profile. The installed package activated, registered commands, and displayed a readonly manifest preview; smoke test exited 0.

## Fixes found by live validation

1. Retrieve/sync completion waited for notification dismissal. Informational notifications now return immediately.
2. Windows argument validation rejected Salesforce percent-encoded layout names. Cross-spawn now handles argument arrays; a real cmd-wrapper regression verifies literal percent signs and shell punctuation. Embedded double quotes remain rejected on Windows.
3. CLI error messages now preserve both stdout and stderr for diagnosis.

The final full live suite completed with no errors after these fixes. An earlier run had one transient Permission Set retrieval failure; the final run successfully repeated that workflow.

## Coverage boundaries

- Aura bundles, custom metadata records and several permission sections were absent in this org. Their parsers have fixture coverage, but actual content for those types was not live-verified.
- Linux/macOS, interactive QuickPick/visual checks, and large-enterprise-org stress testing remain additional coverage rather than claimed passes.
- Metadata API filtering/list limits, branch-scoped search, and synchronous per-component parsing remain documented product limitations.

Reproduce using `npm test` and the opt-in `npm run test:host` instructions in TEST_PLAN.md. The packaged smoke runner is `tests/host/smoke.cjs`.
