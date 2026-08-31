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

- `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` for signup confirmation without browser-bound PKCE state.
- `{{ .ConfirmationURL }}` for recovery, magic link, email change, invite, and reauthentication links.
- `{{ .Email }}` where the recipient address is useful in account-context copy.
- `{{ .SiteURL }}` for the password-changed source template CTA/fallback.

The transactional vote confirmation template uses application/server-side placeholders for a later sending pass:

- `{{ pseudo }}`
- `{{ poll_title }}`
- `{{ results_url }}`
- `{{ recipient_email }}`

## Supabase Configuration

Copy the final HTML body from each `auth/*.html` file into the corresponding Supabase Auth email template screen when configuring Auth emails. Subjects are documented in the comments at the top of each file and in `previews/index.html`.

This pass does not configure SMTP. A custom SMTP/provider should be configured and verified before production email sending. The post-vote transactional email requires a later server-side sender/provider implementation and must not be sent from the client.

TODO for the later Supabase/Auth integration pass: configure the actual password reset / recovery link expiry to 15 minutes in the authentication provider/Supabase settings so that the email copy matches the real behavior.

The signup confirmation Email OTP expiration has been manually verified in Supabase Dashboard: its value is 900 seconds, or 15 minutes. The confirmation template can therefore announce a 15-minute lifetime. Its copy must not instruct recipients to reuse the browser that initiated signup.

## Logo Handling

The app includes SVG logo assets and email-oriented PNG logo assets:

- `assets/email/stamio-logo-horizontal-email@4x.png`
- `assets/email/stamio-logo-horizontal-email@2x.png`
- `assets/email/social-x@4x.png`
- `assets/email/social-instagram@4x.png`
- `assets/email/social-tiktok@4x.png`

Email clients do not reliably support inline SVG. Use the PNG logo and social PNG icons for previews. Production email templates expect these assets to be hosted under `/email-assets/`.

Source assets are stored in `assets/email/`. Web-public copies are stored in `public/email-assets/` so Expo web export includes them in the static output.

After web deployment, verify these public URLs before configuring Supabase Auth templates:

- `https://stamio.fr/email-assets/stamio-logo-horizontal-email@4x.png`
- `https://stamio.fr/email-assets/social-x@4x.png`
- `https://stamio.fr/email-assets/social-instagram@4x.png`
- `https://stamio.fr/email-assets/social-tiktok@4x.png`

Do not use local filesystem paths in production email HTML.

## Privacy And Security Notes

- Do not include sensitive vote/account data in transactional emails.
- Do not include the selected answer by default.
- Do not expose phone numbers, phone hashes, IP addresses, user IDs, vote IDs, or technical identifiers.
- Use `participation`, `résultats agrégés`, and `question ouverte`; do not call a result representative or an official poll.
