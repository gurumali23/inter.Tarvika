# TARVIKA Internship & Career Portal

Independent plain HTML, CSS and vanilla JavaScript portal preview. The supplied TARVIKA logo is used unmodified throughout the portal, including the shared header/footer and favicon. No existing website source, SRS, API configuration or backend credential was present in the workspace, and the main site was not reachable from the development environment.

## Local preview

Run a static server from this directory (opening files directly may restrict browser APIs): `python -m http.server 5500`, then visit `http://localhost:5500/`. (Note: Port 5500 is required for backend API communication due to CORS origin restrictions). No build step or dependencies are required.

## Project map

- `index.html`, `internships.html`, `internship-details.html`, `programs.html`, `apply.html`, `dashboard.html`, `about.html`, `faq.html`, `contact.html`, `privacy.html`, `terms.html`, `admin.html`, `404.html`: portal pages.
- `admin.html`: Executive Admin Portal powered by Firebase (Authentication & Realtime Database) for candidate review, application status workflow, notes, opportunity publishing and CSV data export.
- `css/`: brand variables, base styles, reusable components, responsive rules, and `css/admin.css` executive dashboard design.
- `js/app.js`: public portal rendering and applicant flow; `js/admin.js`: Firebase SDK v13 module for admin console operations; `js/config.js`: Firebase integration configuration.
- `data/`: clearly labelled preview opportunity, domain and FAQ data.
- `docs/`: API, deployment and client handover requirements.

## Before release

Obtain and use the actual TARVIKA logo and approved image/font assets; verify brand rendering against the current main website; confirm domain ownership and canonical host; configure and security-review server APIs; obtain owner/legal approval for opportunity content and policy drafts; configure CSP/security headers and HTTPS; then run browser/device and backend security testing. Do not collect candidate data from this preview.
