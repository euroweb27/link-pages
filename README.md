# Link Pages

Each member builds public pages of links at `/p/<handle>`, collects sign-ups from visitors, and sees how many people view the page and click each link.

Inspired by https://linktr.ee

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Create pages with a handle, name, bio, picture and a light or dark look, and add, order, schedule and switch off links and section headers.
- Share a public page on any device, where every link click is counted before the visitor is sent on.
- Turn on a sign-up form, then search, delete and download its submissions as CSV.
- See views, clicks, click rate, a daily chart, clicks per link, top sources and top countries for 7 or 30 days.
- Download a QR code for a page as PNG or SVG; scans show up as the source "qr".

Left out: accounts and sign-in, which your Gateway handles; mobile apps; selling and payments; bookings; social post scheduling; integrations; plans and billing; short links; custom fonts, thumbnails and templates.

## Setup

```sh
pnpm install
pnpm dev            # run locally, signed in as a test user
pnpm test           # unit tests
pnpm run deploy     # deploy behind your EveryApp Gateway
```

The app needs no secrets or settings. It uses a D1 database and an R2 bucket for pictures, which the deploy creates; R2 has to be enabled on the Cloudflare account once. `checks/` holds the browser and request suites, which run against a packaged release in the oss.new runtime.

Every member of the organization can open the app. Admins also get "All pages", where they can unpublish any page.

## Limitations

- Pages live at `/p/<handle>` on the app's own address; there are no custom domains.
- Countries come from Cloudflare's request data and show as "Unknown" when it has none.
- Analytics count every page load, with no bot filtering or unique-visitor counting.
- Changing a page's handle breaks its old address and any printed QR code.
