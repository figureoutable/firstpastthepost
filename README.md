# Figures onboarding site

The client-facing site at [tryfigures.app](https://tryfigures.app). It handles:

- **Client onboarding** (`/onboard`): Self Assessment, company, or both. Collects contact details, tax references, ID documents, anti-money laundering answers and previous accountant details.
- **Company formation** (`/incorporate`): a 9-step form for a new UK limited company.
- **Venture** (`/venture`): tools for startups (SEIS/EIS, future equity agreements, cap table, EMI, R&D). Hidden on the live site until `NEXT_PUBLIC_VENTURE_ENABLED=true`.

Built with Next.js, deployed on Vercel. Pushing to `main` deploys the live site; any other branch gets a preview link.

## How a submission flows

1. The client starts a form and gets an 8-character resume code. Progress autosaves to private storage.
2. On submit, ID documents upload to the **private** Blob store and the submission is saved there too.
3. A row is added to the Google Sheet (live site only) and an email goes to `NOTIFY_EMAIL`, with signed links to the documents (valid 90 days) and a button to start the Firmcheck AML check (it asks you to confirm first).
4. The client gets a "what happens next" email.
5. A daily job deletes unfinished drafts after 30 days. Submitted records are kept (Money Laundering Regulations: five years after the relationship ends).

## Environment variables (Vercel)

| Name | What it is |
| --- | --- |
| `PRIVATE_BLOB_READ_WRITE_TOKEN` or `PRIVATE_BLOB_STORE_ID` | Created when the private store is connected with the prefix `PRIVATE_BLOB`. |
| `BLOB_READ_WRITE_TOKEN` | The old public store. Only used as a fallback until the private store is connected. |
| `RESEND_API_KEY` | Sends emails. |
| `EMAIL_FROM` | Sender, e.g. `Figures <hello@tryfigures.com>`. Must be on a domain verified in Resend, or client emails will not be delivered. |
| `NOTIFY_EMAIL` | Where new submissions go. Defaults to joshua@tryfigures.com. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact email shown to clients. Defaults to joshua@tryfigures.com. |
| `AML_INITIATE_SECRET` | Signs AML links (and document links unless `DOCUMENT_LINK_SECRET` is set). |
| `FIRMCHECK_API_KEY` | Firmcheck API. |
| `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheet logging. |
| `CRON_SECRET` | Protects the daily jobs. |
| `NEXT_PUBLIC_APP_URL` | Live site address, used in email links. |
| `NEXT_PUBLIC_VENTURE_ENABLED` | Set to `true` to show Venture on the live site. |

Firm details for the footer and privacy notice live in `lib/figures-config.ts`.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without the environment variables above, forms load but submitting will fail.
