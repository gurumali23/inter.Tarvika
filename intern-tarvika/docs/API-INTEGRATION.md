# API integration boundary

## Findings

No repository files, Cloudflare Worker source or URL, Firebase project configuration, SRS, deployed API, authentication settings, database schema, storage policy or CORS configuration were present in the workspace. The referenced existing system could not be inspected or tested. No endpoints are presumed to exist. `js/config.js` intentionally has an empty API base and demo mode enabled.

## Required services before launch

The backend owner should document and provide reviewed endpoints for: public approved opportunity listing/detail; authenticated application creation; authenticated candidate session/profile and own-application reads; candidate logout/session revocation; authenticated staff opportunity create/update/close; staff application search/detail/status updates/internal notes; and authorized export if permitted. Define request/response schemas, validation, error codes, pagination and idempotency behavior. Do not return private candidate fields in public listings.

Enforce candidate ownership and staff permissions server-side on every request. Use a secure session design (prefer HttpOnly, Secure, SameSite cookies where appropriate), CSRF protection if cookie authenticated, rate limits, input validation, audit records and restrictive CORS allowlists. Store resumes in private object storage with short-lived authorized access. Never put tokens, applicant details or resume URLs in query strings or logs. Define retention, deletion, breach response and access procedures with the owner.

## Frontend connection points

Set `apiBaseUrl` only after endpoint ownership, TLS, CORS and security review. Extend `js/config.js` with exact verified routes and connect `js/app.js` to those documented schemas. Keep demo listings explicitly separate from API results. Application UI must remain disabled until server validation, duplicate handling, secure document handling and success/error contracts are tested. Create an application reference only from a successful server response. Dashboard and admin pages must use backend sessions and authorization, never localStorage role flags.

## Deployment smoke checklist

Test unauthenticated/private resource denial, candidate A vs candidate B ownership, expired session handling, staff role denial, CORS preflight, invalid payloads, duplicate submission/idempotency, server errors, private resume access and audit records in a non-production environment. The static preview has not been connected to or tested against any API.
