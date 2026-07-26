# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.6.x | Yes |
| < 0.6 | Best-effort; please upgrade |

## Reporting a vulnerability

Please report security issues privately.

1. Email the maintainer via the address on [npm package wolbarg](https://www.npmjs.com/package/wolbarg) / GitHub profile [Atharvmunde11](https://github.com/Atharvmunde11), **or**
2. Use [GitHub Security Advisories](https://github.com/wolbarg/wolbarg/security/advisories/new) if available on the repository.

Include:

- Affected versions
- Impact (data leak, DoS, RCE, etc.)
- Reproduction steps or proof of concept
- Any suggested fix

We will acknowledge receipt as soon as practical and coordinate a fix and disclosure timeline.

## Scope notes

- `organization` is a storage namespace, not an authentication system. Tenant isolation bugs in storage query paths are in scope; missing app-level auth is not.
- Do not pass untrusted user input as embedding/LLM/rerank `baseUrl` values (SSRF). Misconfiguration of trusted URLs is an application concern; SDK hardening patches may still be considered.
- Optional peer parsers (PDF/DOCX/OCR) inherit those libraries’ security properties.
