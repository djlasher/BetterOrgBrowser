# BetterOrgBrowser Known Limitations

Current known limitations and gaps.

## UX Limitations

- Manifest selections are not visible enough yet.
- Manifest selections reset when the extension host reloads.
- Node-specific commands are intended for right-click context menus.
- Retrieve output currently shows raw JSON.

## Metadata Limitations

- Permission Sets are placeholder-only.
- Custom Object drilldown currently focuses on Fields.
- Profiles are not supported yet.
- Lightning Web Components are not supported yet.
- Layouts, FlexiPages, tabs, validation rules, record types, list views, and field sets are not supported yet.

## Performance Limitations

- No metadata caching yet.
- Large orgs may be slow.
- Repeated expansion may trigger repeated CLI calls.

## Security And Storage Limitations

- No persisted manifest selection state yet.
- No formal cache storage policy yet.
- No structured log redaction policy yet.

## Future Work

Track fixes in ROADMAP.md and DEVLOG.md.
