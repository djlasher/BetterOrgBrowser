# Contributing To BetterOrgBrowser

Basic contribution notes for BetterOrgBrowser.

## Setup

```bash
npm install
npm run compile
```

## Local Development

Open the extension repo in VS Code and press F5 to launch the Extension Development Host.

In the Extension Development Host, open a separate SFDX project for retrieval testing.

## Important Repo Rule

Do not commit retrieved Salesforce metadata into this extension repo.

The extension repo should remain a VS Code extension project.

## Suggested Workflow

- Create a small focused branch.
- Keep changes scoped.
- Compile before committing.
- Test in Extension Development Host.
- Update docs when behavior changes.

## Commit Guidance

Use concise commit messages such as:

- Add manifest selection display
- Improve retrieve result summary
- Add permission set listing
- Add metadata cache service

## Documentation Guidance

Update these files when relevant:

- ROADMAP.md
- SESSION_NOTES.md
- DEVLOG.md
- KNOWN_LIMITATIONS.md
- SECURITY_REVIEW.md
