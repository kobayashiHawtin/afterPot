# Security Policy

We take the security and privacy of our users seriously. Please follow the guidance below when reporting vulnerabilities.

## Supported Versions

We support the latest released version of AfterPot. Security fixes will generally target the most recent release.

## Reporting a Vulnerability

- Please do not open public issues for security reports.
- Instead, report vulnerabilities privately via:
  - GitHub Security Advisories (preferred): https://github.com/kobayashiHawtin/afterPot/security/advisories
  - Or contact the repository maintainer directly

Please include:
- A clear description of the issue and potential impact
- Steps to reproduce (PoC if possible)
- Affected version and environment

We aim to triage new reports within 5 business days.

## Handling of Sensitive Data

- API keys are never committed to the repository and should be provided by users at runtime.
- Logs avoid printing sensitive content by default. Detailed logs are only emitted in development builds when the `VERBOSE_LOG` environment variable is set.
- Network communication uses HTTPS.

## Scope

This policy covers the AfterPot app and code contained in this repository. Third‑party dependencies are out of scope, but we welcome heads‑up if an upstream issue impacts this project.
