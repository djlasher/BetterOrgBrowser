# BetterOrgBrowser Decisions

Lightweight architecture decision log.

## Decision Format

Each decision should include:

- Context
- Decision
- Rationale
- Consequences

## DEC-001 - Use TypeScript

### Context

VS Code extensions are Node-based and the VS Code API is TypeScript-friendly.

### Decision

Build BetterOrgBrowser as a TypeScript VS Code extension.

### Rationale

This aligns with the native extension development model and provides better typing for VS Code APIs.

## DEC-002 - Use Salesforce CLI For Auth And Metadata Operations

### Context

Direct Salesforce authentication would require managing OAuth, tokens, and refresh behavior.

### Decision

Delegate Salesforce auth and org access to Salesforce CLI.

### Rationale

This keeps the extension local-first and avoids storing credentials.

## DEC-003 - Keep Extension Repo Separate From SFDX Retrieval Projects

### Context

The extension is not itself a Salesforce project.

### Decision

Use separate SFDX test projects for retrieval testing.

### Rationale

This prevents retrieved metadata from being committed into the extension repo.
