# BetterOrgBrowser Security Review

Security notes for BetterOrgBrowser.

## Current Model

BetterOrgBrowser is a local VS Code extension. It delegates Salesforce authentication to Salesforce CLI instead of handling OAuth directly.

## Authentication

The extension does not store Salesforce usernames, passwords, access tokens, refresh tokens, or session IDs.

Salesforce CLI owns auth state.

## Current Data Storage

Currently stored in memory:

- Selected org
- Tree nodes
- Manifest selections
- Field describe details

Currently written to disk:

- `manifest/package.xml`

## Not Currently Implemented

- No telemetry
- No external backend
- No cloud sync
- No credential handling
- No metadata cache persistence

## Local File Access

The extension should only write workspace-relative project files when the user triggers an action.

The extension repo should not be used as the retrieval target. Retrieval testing should happen in a separate SFDX project.

## Command Execution Notes

Salesforce CLI commands should be executed with argument arrays where possible. Avoid building shell command strings from user input.

## Future Review Areas

- Metadata caching
- Webview rendering
- XML parsing
- Dependency analysis
- Permission set parsing
- Output channel logging
- Large org behavior

## Current Assessment

Current risk is relatively low because the extension is local-first, CLI-based, and does not manage credentials directly.
