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
| `EMAIL_FROM` | Sender, e.g. `Josh at Figures <joshua@tryfigures.app>`. Must be on a domain verified in Resend, or client emails will not be delivered. Replies go to `NOTIFY_EMAIL`. |
| `CLIENT_EMAIL_CC` | Copied on every client email (not sign-in links). Defaults to joshua@tryfigures.com. |
| `NOTIFY_EMAIL` | Where new submissions go. Defaults to joshua@tryfigures.com. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact email shown to clients. Defaults to joshua@tryfigures.com. |
| `AML_INITIATE_SECRET` | Signs AML links (and document links unless `DOCUMENT_LINK_SECRET` is set). |
| `FIRMCHECK_API_KEY` | Firmcheck API. |
| `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheet logging. |
| `CRON_SECRET` | Protects the daily jobs. |
| `NEXT_PUBLIC_APP_URL` | Live site address, used in email links. |
| `NEXT_PUBLIC_VENTURE_ENABLED` | Set to `true` to show Venture on the live site. |

Firm details for the footer and privacy notice live in `lib/figures-config.ts`.

## Client links: engagement letter, payment, onboarding

The team creates a link at `/admin/new`. The client opens `/start/<link>` and goes through:

1. **Engagement letter**: read and sign (typed name and a tick). A PDF with the signing record is saved, emailed to both sides and saved to Google Drive.
2. **Payment**: Direct Debit through GoCardless (default), card upfront through Stripe, or no payment step. Only the team chooses this.
3. **Onboarding**: the existing form, prefilled. Submitting works exactly as before (email, Google Sheet, AML button). For a **Company formation** link, this step is the company formation form instead.

The server checks each step before the next opens, so steps can't be skipped. The status board at `/admin` shows where everyone is.
Nothing in the app ever cancels a mandate, refunds a payment or edits Xero. Problems (failed or cancelled Direct Debits, AML failures) are flagged for the team.

Links last 60 days. Emailing a link again gives it another 60 days. Until the client signs, the team can edit the details, services and payment (same link, updated letter).
The public `/onboard` form is switched off for new clients (people who already started can still finish with their code). The home page offers a free call instead.
Settings has two switches, both off by default: start AML checks automatically for link clients (live site only), and one daily summary email instead of the "signed" and "payment set up" emails.

The letter wording is in `lib/engagements/letter.ts` (placeholder until the real template is added). Prices are edited in Settings.

| Name | What it is |
| --- | --- |
| `ADMIN_SESSION_SECRET` | Long random text that signs team sign-ins. Falls back to `AML_INITIATE_SECRET`. |
| `ADMIN_EMAILS` | Owners, always admins. Defaults to joshua@tryfigures.com. Others are added in Settings. |
| `GOCARDLESS_ACCESS_TOKEN` | Read-write access token. Test one first (sandbox). |
| `GOCARDLESS_ENVIRONMENT` | `sandbox` (default) or `live`. |
| `GOCARDLESS_WEBHOOK_SECRET` | From the webhook endpoint pointing at `/api/webhooks/gocardless`. |
| `STRIPE_SECRET_KEY` | `sk_test_...` while testing, then `sk_live_...`. |
| `STRIPE_WEBHOOK_SECRET` | From the webhook pointing at `/api/webhooks/stripe` (event `checkout.session.completed`). |
| `GOOGLE_DRIVE_CLIENTS_FOLDER_ID` | The Shared Drive "Clients" folder. Add the service account email to the Shared Drive as Content manager. |
| `COMPANIES_HOUSE_API_KEY` | Optional. Fills company details from a company number. |

With no payment keys, preview builds let you simulate the payment step. The live site never does.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without the environment variables above, forms load but submitting will fail.
