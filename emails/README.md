# Stamio Email Templates

This folder contains pass-1 HTML templates and visual previews only. Real sending is not wired yet, SMTP is not configured, and no Supabase configuration has been pushed.

## Structure

- `auth/confirmation.html` - Supabase Auth signup/email confirmation.
- `auth/recovery.html` - Supabase Auth password recovery.
- `auth/magic-link.html` - Supabase Auth magic link / email login.
- `auth/change-email.html` - Supabase Auth email change confirmation.
- `auth/invite.html` - Supabase Auth invitation.
- `auth/reauthentication.html` - Supabase Auth sensitive action confirmation.
- `auth/password-changed.html` - security notification source template for a password change event.
- `transactional/vote-confirmation.html` - registered-user post-vote confirmation email.
- `previews/index.html` - browser gallery with desktop and mobile-width previews.
- `previews/*-preview.html` - standalone browser previews with realistic fake values.

## Variables

Supabase Auth templates keep Supabase-compatible variables in the final HTML:

- `{{ .ConfirmationURL }}` for confirmation, recovery, magic link, email change, invite, and reauthentication links.
- `{{ .Email }}` where the recipient address is useful in account-context copy.
- `{{ .SiteURL }}` for the password-changed source template CTA/fallback.

The transactional vote confirmation template uses application/server-side placeholders for a later sending pass:

- `{{ poll_title }}`
- `{{ results_url }}`
- `{{ support_email }}`

## Supabase Configuration

Copy the final HTML body from each `auth/*.html` file into the corresponding Supabase Auth email template screen when configuring Auth emails. Subjects are documented in the comments at the top of each file and in `previews/index.html`.

This pass does not configure SMTP. A custom SMTP/provider should be configured and verified before production email sending. The post-vote transactional email requires a later server-side sender/provider implementation and must not be sent from the client.

## Logo Handling

The app includes SVG logo assets and email-oriented PNG logo assets:

- `assets/email/stamio-logo-horizontal-email@4x.png`
- `assets/email/stamio-logo-horizontal-email@2x.png`
- `assets/email/social-x@4x.png`
- `assets/email/social-instagram@4x.png`
- `assets/email/social-tiktok@4x.png`

Email clients do not reliably support inline SVG. Use the PNG logo and social PNG icons for previews. Before production sending, host these PNG assets publicly and replace template image sources with verified HTTPS URLs, such as the intended paths documented in the confirmation template. Do not use local filesystem paths in production email HTML.

## Privacy And Security Notes

- Do not include sensitive vote/account data in transactional emails.
- Do not include the selected answer by default.
- Do not expose phone numbers, phone hashes, IP addresses, user IDs, vote IDs, or technical identifiers.
- Use `participation`, `résultats agrégés`, and `question ouverte`; do not call a result representative or an official poll.
