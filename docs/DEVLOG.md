# BetterOrgBrowser Devlog

Session-based development history for BetterOrgBrowser.

Use versions instead of dates. Keep this to one entry per work session.

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
