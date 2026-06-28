# BetterOrgBrowser Known Issues

Current known issues and follow-up items discovered during Extension Development Host testing.

## Copy Full Metadata Path For Permission Set Child Nodes

### Issue

Copy Full Metadata Path is currently node-based instead of hierarchy-aware for nested Permission Set nodes.

Examples of current behavior:

```text
Permission Sets > MyPermSet > Object Permissions
→ copies: Object Permissions

Permission Sets > MyPermSet > Object Permissions > Case
→ copies: Case

Permission Sets > MyPermSet > Field Permissions > Account.Name
→ copies: Account.Name or a raw field-like value without full Permission Set context
```

### Impact

- Permission Set folder and child permission entries lose important parent context.
- Copied values are less useful for troubleshooting, documentation, package planning, or future dependency workflows.
- The command works well for top-level metadata nodes but feels inconsistent in deeper tree paths.

### Desired Fix

Make Copy Full Metadata Path hierarchy-aware for Permission Set nodes.

Expected examples:

```text
Permission Sets > MyPermSet > Object Permissions
→ PermissionSet: MyPermSet > Object Permissions

Permission Sets > MyPermSet > Object Permissions > Case
→ PermissionSet: MyPermSet > ObjectPermission: Case

Permission Sets > MyPermSet > Field Permissions > Account.Name
→ PermissionSet: MyPermSet > FieldPermission: Account.Name
```

Possible implementation approaches:

- Add enough parent metadata to `MetadataNode` to build richer paths.
- Add path-specific handling for Permission Set folder and permission entry node types.
- Consider a small metadata path formatter helper instead of expanding command logic inline.

## Permission Set Loading Progress Text Visibility

### Issue

Permission Set remote retrieval now shows a progress indicator, but VS Code may display only the progress bar without consistently showing the notification title text.

### Impact

- The user can tell something is loading, but the exact operation may not be obvious.
- Slow Permission Set retrieves still feel somewhat opaque.

### Desired Fix

Improve loading feedback for slow Permission Set operations.

Possible options:

- Show the Permission Set cache output channel on cache MISS.
- Add explicit tree placeholder rows such as `Loading remote Permission Set metadata...`.
- Add a status bar item during Permission Set retrieval.
- Keep the progress notification but supplement it with output logging that is easier to see.

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
- Permission Set XML responses beyond the current session-only cache

## Resolved In v0.0.5

The following issues were addressed in the v0.0.5 session and are kept here only as historical reference:

- Manifest Selection Preview opened as an editable temporary document.
- Clear Manifest Selections did not update an already-open preview.
- Permission Set cache behavior had no visible cache hit/miss logging.

## Guardrail

Do not add deploy behavior. BetterOrgBrowser should retrieve from the org and patch local files, but not deploy changes back to Salesforce unless explicitly planned later.
