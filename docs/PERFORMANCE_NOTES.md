# BetterOrgBrowser Performance Notes

Notes for large org performance planning.

## Current State

The extension currently calls Salesforce CLI on demand when loading org metadata and object details.

## Current Risks

- Large orgs may return many metadata records.
- Repeated expand and collapse actions may repeat CLI calls.
- Object describe calls may become slow in large orgs.
- No cache exists yet.

## Future Improvements

- Cache metadata list responses by org and metadata type.
- Cache object describe responses by org and object.
- Add refresh commands.
- Add loading indicators.
- Add max result warnings.
- Avoid unnecessary repeated CLI calls.

## Testing Notes

Performance should be tested against both small demo orgs and large enterprise orgs.
