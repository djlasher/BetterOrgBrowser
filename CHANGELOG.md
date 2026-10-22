# Changelog

User-facing changes are collected under Unreleased until a release is published.
Development builds may already carry the planned version number.

## Unreleased — planned 0.0.6

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
