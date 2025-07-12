# Secret Scanning

This repository includes a GitHub Action workflow that automatically scans for secrets and API keys before publishing.

## How it works

The workflow uses [TruffleHog](https://github.com/trufflesecurity/trufflehog), an open-source static analysis tool that:

- Scans for secrets, API keys, passwords, and other sensitive data
- Runs automatically on pull requests and pushes to the main branch
- Prevents publication if verified secrets are detected
- Uses pattern matching and entropy analysis to detect potential secrets

## Workflow Details

- **File**: `.github/workflows/secret-scan.yml`
- **Triggers**: Pull requests and pushes to main branch
- **Tool**: TruffleHog OSS
- **Configuration**: Only verified secrets cause failures (`--only-verified` flag)
- **Behavior**: Fails the workflow and prevents merging/publishing if secrets are found

## What gets scanned

- All files in the repository
- Commit history (with full git history)
- Common secret patterns (API keys, tokens, passwords, etc.)

## If a secret is detected

1. The workflow will fail
2. The pull request cannot be merged
3. Review the TruffleHog output to identify the secret
4. Remove the secret from the code and commit history if necessary
5. Re-run the workflow

## Common false positives

- Google Analytics IDs (public by design)
- Example/dummy keys in documentation
- Test data that looks like secrets

The workflow is configured to only fail on verified secrets to minimize false positives.