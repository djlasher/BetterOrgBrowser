# BetterOrgBrowser Devlog

Session-based development history for BetterOrgBrowser.

Use versions instead of dates. Keep this to one entry per work session.

## v0.0.4 - Permission Set Sync Stabilization

### Completed

- Added granular Field Permission sync from remote Permission Set XML into local source-format Permission Set XML.
- Added granular Object Permission sync using the same remote retrieve and single-entry merge pattern.
- Added shared Permission Set merge helpers for locating, replacing, sorting, and inserting XML blocks.
- Fixed Field Permission sync so entries are inserted into the Field Permission section instead of being appended near the bottom of the Permission Set.
- Fixed Object Permission sync so entries are inserted before later Permission Set sections such as tab settings.
- Fixed repeated sync behavior so syncing an existing field or object permission replaces the existing block instead of duplicating it.
- Added canonical 4-space XML formatting for synced permission blocks.
- Added editor-aware file read/write helpers so sync operations update already-open VS Code documents instead of only writing behind the editor.
- Added remote Permission Set XML session cache keyed by selected org and Permission Set API name.
- Cleared remote Permission Set XML cache when the selected org changes or the tree refreshes.
- Added Object Permission sync command and inline cloud-download action.
- Updated Permission Set sync testing through the VS Code Extension Development Host.
- Updated docs for current state, next priorities, and known issues.

### Validated Test Cases

- Existing Field Permission sync does not duplicate entries.
- New Field Permission sync inserts cleanly with normal indentation.
- Repeating the same Field Permission sync produces no unnecessary change.
- Closing and reopening the Permission Set XML preserves formatting.
- Field sync works after Extension Development Host restart.
- Object Permission sync works after Field Permission sync.
- Object Permission sync from a minimal file inserts in the correct section.
- Field Permission sync after Object Permission sync inserts above Object Permissions.
- Dirty/open editor sync uses the current editor content and saves cleanly.

### Current Gaps

- Manifest preview UX needs improvement: Show Manifest Selections opens an editable temporary document that can prompt to save on close.
- Clearing manifest selections does not update an already-open manifest selections preview document.
- `extension.ts` is too large and should be modularized before many more features are added.
- `package.json` menu contribution rules need cleanup after repeated command additions.
- Remaining Permission Set folders are still placeholder shells: Apex Class Access, Flow Access, Custom Permissions, Tab Settings, and User Permissions.
- Cache behavior needs visible logging so cache hits and misses can be confirmed without guessing from speed.

### Next Focus

- Fix Manifest Selection preview UX and clear-selection feedback.
- Modularize `extension.ts` into command and service files.
- Add cache hit/miss logging for remote Permission Set XML.
- Implement remaining Permission Set folders.
- Begin richer Custom Object drilldown.

## v0.0.3 - Persistence And Status UX

### Completed

- Added workspace-state persistence for manifest selections.
- Added workspace-state persistence for selected Salesforce org.
- Added manifest selection restore on extension activation.
- Added selected org restore on extension activation.
- Added live manifest selection status bar counter.
- Added clickable status bar shortcut to Show Manifest Selections.
- Added helper storage modules:
  - `manifestSelectionStore.ts`
  - `selectedOrgStore.ts`

### Current Gaps

- No dedicated Manifest Selections tree section yet.
- No visual selected-state indicator on metadata nodes.
- Retrieve results still display raw JSON.
- Permission Sets are still placeholder-only.

### Next Focus

- Improve retrieve result formatting.
- Add output channel logging.
- Begin Permission Set implementation.
- Refactor large `extension.ts` into smaller modules.

## v0.0.2 - Manifest Selection UX Commands

### Completed

- Added package.xml selection helper methods.
- Added Remove from Manifest command.
- Added Clear Manifest Selections command.
- Added Show Manifest Selections command.
- Registered new commands in package.json.
- Added toolbar actions for showing selections, clearing selections, and refreshing the tree.
- Added right-click Remove from Manifest option for supported metadata nodes.

### Current Gaps

- No dedicated Manifest Selections tree section yet.
- Remove from Manifest does not visually indicate whether a node is already selected.

### Next Focus

- Persist manifest selections with workspace state.
- Add visible manifest selection count.
- Consider adding a Manifest Selections tree node.
