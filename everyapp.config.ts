import { defineEveryApp } from "@every-app/sdk";

export default defineEveryApp({
  id: "link-pages",
  name: "Link Pages",
  description:
    "Public pages of links for your team, with sign-up forms, QR codes and click analytics.",
  icon: "/icon.svg",
  access: "everyone",
  resources: {
    // Pages, links, sign-ups and view and click events.
    d1: ["DB"],
    // Profile pictures.
    r2: ["files"],
  },
  public: [
    // The page visitors see, its picture, the redirect each link goes
    // through and its sign-up form. Each checks the page is published.
    { path: "/p/:handle", methods: ["GET"] },
    { path: "/p/:handle/avatar", methods: ["GET"] },
    { path: "/p/:handle/go/:itemId", methods: ["GET"] },
    { path: "/p/:handle/signup", methods: ["POST"] },
  ],
  // The stylesheet the public page loads.
  publicAssets: ["/assets/**", "/icon.svg"],
});
