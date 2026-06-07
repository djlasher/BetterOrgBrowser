# BetterOrgBrowser Devlog

Session-based development history for BetterOrgBrowser.

Use versions instead of dates. Keep this to one entry per work session.

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
