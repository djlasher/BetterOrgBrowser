# BetterOrgBrowser Devlog

Session-based development history for BetterOrgBrowser.

Use versions instead of dates. Keep this to one entry per work session.

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

- Manifest selections are still in memory only.
- No dedicated Manifest Selections tree section yet.
- Remove from Manifest does not visually indicate whether a node is already selected.

### Next Focus

- Persist manifest selections with workspace state.
- Add visible manifest selection count.
- Consider adding a Manifest Selections tree node.

## v0.0.1 - Extension Foundation And Live Metadata MVP

### Completed

- Created TypeScript VS Code extension scaffold.
- Added Better Org Browser activity bar container.
- Added metadata explorer tree view.
- Added Salesforce CLI integration.
- Added org selection through QuickPick.
- Added live browsing for Apex Classes, Flows, Custom Objects, and Object Fields.
- Added field detail inspection.
- Added Copy API Name.
- Added Add to Manifest.
- Added package.xml generation.
- Added manifest preview and write commands.
- Added retrieve command through Salesforce CLI.
- Successfully tested retrieval in a separate SFDX test project.

### Current Gaps

- Manifest selections are not visible enough yet.
- Manifest selections are not persisted yet.
- Permission Sets are still placeholder-only.
- Retrieve output is still raw JSON.
- No caching or dependency analysis yet.

### Next Focus

- Improve manifest selection UX.
- Add clear, show, and remove selection commands.
- Add better retrieve summaries.
