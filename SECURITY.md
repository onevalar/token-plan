# Security Policy

Please report security problems privately through the repository's
[Security Advisories page](https://github.com/onevalar/token-plan/security/advisories/new) rather than a public issue.

TokenPlan reads credentials that other tools already keep on your Mac and sends them only to the matching provider's own API. It has no analytics or crash-reporting service. The optional local HTTP API listens on `127.0.0.1` only, serves usage numbers (never credentials) and rejects browser-origin requests.
