# BetterOrgBrowser Architecture

High-level architecture notes for the BetterOrgBrowser VS Code extension.

## Overview

BetterOrgBrowser is a local VS Code extension for browsing Salesforce metadata, selecting exact components, generating package.xml, and retrieving metadata into an SFDX project.

## Current Flow

```text
VS Code Extension
-> Metadata Tree Provider
-> Org Service
-> Salesforce CLI
-> Salesforce Org
```

## Core Components

### Extension Entry Point

`src/extension.ts`

Handles activation, command registration, and tree view registration.

### Metadata Provider

`src/metadata/metadataProvider.ts`

Builds the metadata tree and lazy-loads metadata categories and child nodes.

### Metadata Node

`src/metadata/metadataNode.ts`

Represents tree nodes and stores metadata context used by commands and menus.

### Org Service

`src/salesforce/orgService.ts`

Wraps Salesforce CLI calls for org selection, metadata listing, object describe, and retrieval.

### Package XML Builder

`src/packageXml/packageXmlBuilder.ts`

Tracks selected metadata and generates package.xml output.

## Current State

The extension has proven the loop from live org browsing to package.xml generation to retrieval.

## Future Architecture Areas

- Manifest selection persistence
- Output channel logging
- Metadata caching
- Permission set XML parsing
- Dependency analysis
- Large org performance improvements
