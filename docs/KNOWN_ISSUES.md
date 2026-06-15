# BetterOrgBrowser Known Issues

Current known issues and follow-up items discovered during Extension Development Host testing.

## Manifest Selection Preview

### Issue

Show Manifest Selections opens an editable temporary Markdown document.

### Impact

- Closing the generated preview can trigger a save/don't-save prompt.
- The preview can become stale if manifest selections change while it is open.

### Desired Fix

- Replace the editable temp document with a readonly/live preview or a dedicated manifest selections tree section.
- Avoid save prompts for generated display-only content.

## Clear Manifest Selections Feedback

### Issue

Clear Manifest Selections updates the persisted manifest selection state, but any already-open Show Manifest Selections preview does not update.

### Impact

- The user can clear selections successfully but still see old entries in the open preview.
- Reopening Show Manifest Selections correctly shows that selections are empty, so the data state is correct but the visual feedback is poor.

### Desired Fix

- Close, refresh, or replace the open manifest preview when selections are cleared.
- Show a clear success message and ensure the status bar count updates immediately.

## Toolbar and Menu Contributions

### Issue

Better Org Browser view/title commands previously appeared as checkbox-like menu entries instead of obvious action buttons.

### Impact

- Refresh, Show Manifest Selections, and Clear Manifest Selections were confusing to test.
- Package contribution rules are becoming fragile after repeated command additions.

### Desired Fix

- Clean up `package.json` command/menu contribution rules.
- Verify title actions render consistently in the tree toolbar and command palette.
- Re-tighten context menu conditions after broadening them during stabilization.

## Permission Set Cache Visibility

### Issue

Remote Permission Set XML is cached in session, but there is no visible cache hit/miss logging yet.

### Impact

- Cache behavior must be inferred from speed or CLI activity.
- QA cannot easily prove whether Object Permissions and Field Permissions reused the same retrieved XML.

### Desired Fix

- Add output channel logging such as:

```text
[PermissionSet Cache MISS] Claygentforce_Support_Manager
[PermissionSet Cache HIT] Claygentforce_Support_Manager
```

## Extension Architecture

### Issue

`src/extension.ts` is too large and contains command registration, manifest commands, permission sync, retrieve logic, file helpers, and UI behavior.

### Impact

- Changes are harder to make safely.
- Full-file edits are risky.
- Feature work is slower because unrelated logic is mixed together.

### Desired Fix

Split into focused modules:

```text
src/commands/manifestCommands.ts
src/commands/permissionSetSyncCommands.ts
src/commands/retrieveCommands.ts
src/salesforce/permissionSetSyncService.ts
src/workspace/textFile.ts
```

## Remaining Permission Set Folders

### Issue

The following Permission Set folders are placeholder shells:

- Apex Class Access
- Flow Access
- Custom Permissions
- Tab Settings
- User Permissions

### Desired Fix

Parse and render each folder from remote Permission Set XML, then consider granular sync for each entry type.

## Large Org Performance

### Issue

Only remote Permission Set XML has session caching so far.

### Desired Fix

Add broader caching and refresh controls for:

- Metadata list responses
- Object describe responses
- Permission Set XML responses with visible cache logging

## Guardrail

Do not add deploy behavior. BetterOrgBrowser should retrieve from the org and patch local files, but not deploy changes back to Salesforce unless explicitly planned later.
