# Repository Guidelines & Rules

## 1. Strict Language Policy (English Only)
- **STRICT ENGLISH ONLY**: All code, identifiers, types, comments, docstrings, markdown documentation, PR/commit messages, CLI help/logs/errors, and release descriptions MUST be written exclusively in clean, professional English.
- Italian is strictly banned in all project code, documentation, and descriptions.
- The ONLY exception is runtime marketplace localization (e.g. generating a listing in Italian when a user explicitly requests Italian output via `-l it`).

## 2. Release & CI/CD Standards
- Release notes and tables must be in clean, professional English.
- Only finalized user-facing distribution binaries (APK, Windows Installer, Windows Portable) must be uploaded to releases. Temporary build artifacts (such as unsigned or aligned APKs) must never be published.

## 3. Git Operations
- Never run `git push` or `git commit` automatically. All remote actions and commits are reserved for explicit user execution.
