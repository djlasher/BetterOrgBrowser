# Changelog

User-facing changes are collected under Unreleased until a release is published.
Development builds may already carry the planned version number.

## Unreleased — planned 0.0.7

### 2026-10-23

- Stage report, dashboard, email-template/folder, and independently retrievable object-child requests in a disposable Salesforce project before copying source into the user's project.
- Copy only explicitly requested files and missing parent descriptors. Existing parent descriptors are preserved; incidental object descriptors have child definitions removed. Folder downloads do not import their reports/templates/dashboards.
- Apply this filtering to inline retrieval and Retrieve Selected Metadata. Explicit whole-object retrieval and Retrieve Manifest retain their requested full scope.
- Existing field extraction, Permission Set entry sync, and bundle-file extraction continue writing only the selected child.
- Validate requested files before copying and remove staging on success or failure. No fallback retrieves the entire parent into the user's source tree.
- Compilation and 51 automated tests passed. Isolated VS Code regression injected extra reports and object fields, verified their exclusion and parent preservation, and checked missing-member failure cleanup. Remote boundaries used fixtures.

## 0.0.6 — previous development build

### 2026-10-22

#### Added

- Local-source indicators: a filled circle shows metadata saved in the selected Salesforce project; an outline circle shows metadata not saved locally. Hover to see its file path.
- Automatic indicator updates after retrieval and filesystem creates, edits, or deletions, including files retrieved before this session.
- Individual presence checks for embedded metadata such as Permission Set entries and custom labels. A containing file alone does not mark all its children as saved.
- This changelog for tracking the next release.

#### Fixed

- Salesforce project discovery now finds `sfdx-project.json` inside an opened parent folder, or in the nearest containing project when a source subfolder is opened. Multiple projects prompt for a target, remembered for the session while available.
- Local-source checks use the selected project's configured package directories and ignore remote retrieval caches. A filled circle indicates local presence, not equality with the org or completeness of every child.
- Fields retrieved individually through the Custom Object tree no longer retain the extra indentation level from their parent object XML. Nested XML keeps its relative indentation; multiline values, CDATA, entities, and LF/CRLF line endings are preserved.

#### Validation

- TypeScript compilation and all 50 automated tests passed, including field formatting with spaces/LF and tabs/CRLF.
- Isolated VS Code regression verified discovery from a parent-folder workspace, individual field downloads and filled markers, and automatic LWC marker updates after external creation/deletion. Existing Permission Set and Flow browsing checks also passed.
- Remote calls in host regressions use fixtures; these checks do not modify a live org.

Implementation and review: [PR #6](https://github.com/djlasher/BetterOrgBrowser/pull/6).

For historical development notes, see [DEVLOG](docs/DEVLOG.md) and [release notes](docs/RELEASE_NOTES.md).
