# Change Log

## 2026-06-24

- **Added "Investment Lever" field** to `index.html` contact form (dropdown with options: starter, growth, scale).
- **Updated `server.js`**:
  - Integrated `dotenv` for environment variables.
  - Parsed `investmentLever` from POST payload.
  - Extended email HTML template to include the new field.
- **Enhanced contact route** to handle the additional data and log it to console.
- **Ran `npm audit fix --force`** – resolved all vulnerabilities (0 remaining).
- **Created test PowerShell request** (`Invoke-RestMethod`) and saved its output as an artifact (`test_email_request.md`).
- **Prepared `.env.example`** (not yet committed) for SMTP configuration (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_TO`).

The application is now ready to send emails once SMTP credentials are provided.
