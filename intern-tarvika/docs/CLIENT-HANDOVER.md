# Client handover

## Implemented for review

- Independent responsive static portal with home, opportunity search/detail, programs, application preview, candidate dashboard boundary, about, FAQs, contact, policy drafts, staff integration boundary and 404 pages.
- Search, category/type/work-mode filtering, sorting, clear filters, load-more control, detail-to-apply selection, accessible mobile navigation, searchable FAQ accordions, validated contact email handoff, live text counts and current-year footer.
- Opportunity records are clearly presented as local preview samples; no live vacancy, stipend, date or eligibility claim is made.

## Not verified / release blockers

- Existing TARVIKA website source and actual logo were unavailable; the site could not be reached during inspection. Current T wordmark is a temporary placeholder. Replace it using the original file without edits.
- Existing Worker/Firebase backend, auth, database, permissions and CORS were absent and not verified. Applications, candidate private dashboard and staff management are not operational.
- Owner confirmation required for institutional copy, approved vacancies, dates, duration, eligibility, compensation/fees, selection process and policies.
- Privacy/terms are review drafts. Retention, legal entity, processors, rights process and operational security need owner/legal approval.
- Deployment provider, domain canonical behavior, security headers and actual production endpoint are not configured.

## Verified in this source review

Static pages and shared client-side interactions are present. No deployment, API request, authenticated flow, actual email delivery, application persistence, or browser/device/assistive-technology verification was performed in this environment. Run those checks after configuration; use `API-INTEGRATION.md` and `DEPLOYMENT.md` as the implementation checklist.
