import { cn } from "cn";
import type { PublicPage } from "@/server/publicPage";

/**
 * The page visitors see, rendered on the server as plain HTML: links are
 * ordinary anchors and the sign-up form posts without script.
 */
export function PublicPageView({
  page,
  stylesheet,
  joined,
  signupError,
}: {
  page: PublicPage;
  stylesheet: string;
  joined: boolean;
  signupError: string | null;
}) {
  const shape = page.buttons === "square" ? "rounded-md" : "rounded-full";
  const avatar = page.avatarKey
    ? `/p/${page.handle}/avatar?v=${page.avatarKey.split("/").pop()}`
    : null;
  return (
    <html lang="en" data-theme={page.theme === "dark" ? "openseo-dark" : "openseo"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.name}</title>
        <link rel="stylesheet" href={stylesheet} />
        <link rel="icon" href="/icon.svg" />
      </head>
      <body>
        <div className="h-dvh overflow-y-auto bg-background text-foreground">
          <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 pt-12 pb-16">
            <header className="flex flex-col items-center gap-3 text-center">
              {avatar ? (
                <img
                  data-testid="public-avatar"
                  src={avatar}
                  alt=""
                  className="size-24 rounded-full border border-border object-cover"
                />
              ) : null}
              <h1 data-testid="public-name" className="text-2xl font-semibold tracking-tight">
                {page.name}
              </h1>
              {page.bio ? (
                <p data-testid="public-bio" className="max-w-md text-sm whitespace-pre-line text-muted-foreground">
                  {page.bio}
                </p>
              ) : null}
            </header>

            <nav className="flex w-full flex-col gap-3">
              {page.items.map((item) =>
                item.kind === "header" ? (
                  <h2
                    key={item.id}
                    data-testid="public-header"
                    className="pt-4 text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {item.title}
                  </h2>
                ) : (
                  <a
                    key={item.id}
                    data-testid="public-link"
                    data-featured={String(item.featured)}
                    href={`/p/${page.handle}/go/${item.id}`}
                    rel="noopener"
                    className={cn(
                      "block w-full border text-center font-medium break-words shadow-xs transition-colors",
                      shape,
                      item.featured
                        ? "border-primary bg-primary px-5 py-6 text-lg text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-card px-5 py-3.5 text-card-foreground hover:bg-muted",
                    )}
                  >
                    {item.title}
                  </a>
                ),
              )}
            </nav>

            {page.signupEnabled ? (
              <section
                id="signup"
                className="w-full rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs"
              >
                {joined ? (
                  <p data-testid="signup-thanks" className="text-center text-sm font-medium">
                    Thanks, you're on the list.
                  </p>
                ) : (
                  <form
                    data-testid="signup-form"
                    method="post"
                    action={`/p/${page.handle}/signup`}
                    className="flex flex-col gap-3"
                  >
                    <h2 className="text-base font-semibold">
                      {page.signupHeading || "Stay in touch"}
                    </h2>
                    {page.signupAskDetails ? (
                      <>
                        <Field label="Name" name="name" type="text" autoComplete="name" />
                        <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
                      </>
                    ) : null}
                    <Field label="Email" name="email" type="email" autoComplete="email" required />
                    {/* Left empty by people; bots fill it. */}
                    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                      <label>
                        Website
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                      </label>
                    </div>
                    {signupError ? (
                      <p role="alert" className="text-sm text-destructive">
                        {signupError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      className={cn(
                        "h-10 bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                        shape,
                      )}
                    >
                      Sign up
                    </button>
                  </form>
                )}
              </section>
            ) : null}
          </main>
        </div>
      </body>
    </html>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        {...props}
        className="h-10 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
    </label>
  );
}
