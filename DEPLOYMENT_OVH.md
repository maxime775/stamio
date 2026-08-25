# OVH Web Deployment

This project is an Expo / React Native Web app backed by Supabase. OVH deployment is a static web upload of the Expo export output.

This deployment pass does not include database pushes, Supabase configuration, Edge Function deployment, SMTP configuration, DNS changes, or OVH upload.

## Build Locally

Run from the project root:

```bash
npx.cmd expo export --platform web
```

The export output is written to `dist/`.

## Upload To OVH

Upload the contents of `dist/` to the OVH web hosting document root. Upload the contents of the folder, not the `dist` folder itself.

The `.htaccess` file must be present at the OVH web root next to `index.html`. Expo export does not copy the root `.htaccess` into `dist/` automatically, so copy `.htaccess` into `dist/.htaccess` before upload or include it manually when uploading the exported files.

The canonical production domain is `https://stamio.fr`. The current `.htaccess` redirects `http://stamio.fr`, `http://www.stamio.fr`, and `https://www.stamio.fr` to `https://stamio.fr`.

These redirects are configured as temporary `302` redirects for the first deployment to avoid browser cache issues while testing. After validation, they can be changed to permanent `301` redirects.

The current `.htaccess` keeps real files and directories working, then falls back all client-side routes to `index.html`. This is required for direct navigation or refresh on routes such as `/themes`, `/results`, `/question/<slug>`, `/resultats/<slug>/vague-<number>`, `/poll/<pollId>`, `/auth/reset-password`, `/account`, and `/about`.

Because this deployment is a single-page static export, an old dynamic `/poll/<pollId>` URL cannot be converted to a series URL by Apache alone: the slug and wave are resolved from Supabase at runtime. The compatibility route therefore uses an application-level `router.replace`. The initial HTTP response remains `200`; it is not a server-side `301`. Canonical tags point to the resolved `/question/<slug>` or `/resultats/<slug>/vague-<number>` URL. A real dynamic `301` would require a generated redirect map deployed with Apache or a server/edge runtime.

The sitemap remains deliberately curated for this version. A series with an active wave publishes `/question/<slug>`; each closed wave with `show_in_results = true` may publish `/resultats/<slug>/vague-<number>`. A series or wave that is neither active nor published in results must not appear. Automating this inventory is deferred to a separate change.

## Email Assets

Production email templates expect assets to be hosted under `/email-assets/`.

Source assets are stored in `assets/email/`. Public web assets are stored in `public/email-assets/`, and Expo export copies them to `dist/email-assets/`.

After uploading to OVH, verify:

- `https://stamio.fr/email-assets/stamio-logo-horizontal-email@4x.png`
- `https://stamio.fr/email-assets/social-x@4x.png`
- `https://stamio.fr/email-assets/social-instagram@4x.png`
- `https://stamio.fr/email-assets/social-tiktok@4x.png`

These URLs must be reachable before configuring Supabase Auth email templates.

## Later Supabase Work

Supabase Auth redirect URLs will be configured in a later pass. The deployment of this static frontend does not change Supabase Auth settings, database schema, Edge Functions, or SMTP/provider settings.

## Live Verification

After upload, verify:

- `https://stamio.fr`
- `https://stamio.fr/email-assets/stamio-logo-horizontal-email@4x.png`
- `https://stamio.fr/email-assets/social-x@4x.png`
- `https://stamio.fr/email-assets/social-instagram@4x.png`
- `https://stamio.fr/email-assets/social-tiktok@4x.png`
- `https://stamio.fr/auth/reset-password`

For `https://stamio.fr/auth/reset-password`, a direct browser refresh should return the app rather than an OVH 404. The app may still show its normal reset-password state depending on Supabase recovery session parameters.
