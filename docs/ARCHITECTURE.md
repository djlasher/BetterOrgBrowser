# Architecture

- `extension.ts`: constructs and disposes services, view, status bar and command modules.
- `commands/`: org selection, manifests, retrieval, search/details/copy, granular permission sync.
- `metadata/metadataRegistry.ts`: types, labels, icons, folder/singleton behavior and parser dispatch.
- `metadata/metadataModel.ts`: VS Code-independent semantic nodes, manifest references, sync keys, hierarchy paths.
- `metadata/metadataNode.ts`: VS Code TreeItem capabilities, icons, descriptions and parents.
- `metadata/metadataProvider.ts`: lazy loading, progress, error rows and stale-org result suppression.
- `metadata/parsers/`: explicit semantic adapters over validated fast-xml-parser output. No arbitrary XML recursion.
- `salesforce/orgService.ts`: centralized Salesforce CLI execution and output logging.
- `salesforce/metadataService.ts`: cached lists/describes/remote files; temporary-directory lifecycle.
- `salesforce/permissionSetMerge.ts`: validated source-span single-entry merge. The scanner only locates edit ranges; the XML parser interprets content.
- `cache/`: promise coalescing/invalidation and CLI concurrency queue.
- `workspace/`: project/package discovery, readonly previews, editor-aware file reads/writes.
- `packageXml/`: deterministic manifest builder and persistent selections.

Metadata browse and sync reads never use source-format retrieval into the project. Only explicit retrieve commands invoke normal project source retrieval. Semantic nodes without a real independent Metadata API member do not advertise manifest actions. Permission Set entries have sync keys rather than fabricated package types.

Unit tests import pure modules directly. Tree tests provide a small VS Code surface stub. Real CLI and extension-host behavior requires manual QA.
