# BetterOrgBrowser Test Plan

Manual and future automated test strategy.

## Local Setup Test

- Run `npm install`.
- Run `npm run compile`.
- Press F5 in VS Code.
- Confirm Extension Development Host opens.
- Confirm Better Org Browser activity appears.

## Org Selection Test

- Run Select Salesforce Org.
- Confirm authorized orgs appear.
- Select a test org.
- Confirm selected org appears in the tree.

## Metadata Browsing Test

Verify these sections load:

- Apex Classes
- Flows
- Custom Objects
- Object Fields

## Field Detail Test

- Expand Custom Objects.
- Expand Account.
- Expand Fields.
- Right-click a field.
- Run Show Field Details.
- Confirm details display.

## Manifest Test

- Add an Apex class to manifest.
- Add a field to manifest.
- Preview manifest.
- Write manifest to file.
- Confirm `manifest/package.xml` exists.

## Retrieval Test

Use a separate SFDX project as the Extension Development Host workspace.

- Write manifest.
- Run Retrieve Manifest.
- Confirm metadata retrieves into the SFDX project.

## Negative Tests

- No selected org.
- No workspace folder.
- Non-SFDX workspace.
- Missing manifest file.
- Invalid org alias.
- Salesforce CLI unavailable.

## Future Automated Tests

- Package XML builder unit tests.
- CLI response parsing tests.
- Metadata node mapping tests.
- Manifest selection state tests.
