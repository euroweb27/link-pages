import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Switch } from "@/client/components/ui/switch";
import { useAction } from "@/client/lib/useAction";
import { getEditorPage, setPublished } from "@/serverFunctions/pages";

export const Route = createFileRoute("/pages/$pageId")({
  loader: ({ params }) => getEditorPage({ data: { pageId: params.pageId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} · Link Pages` : "Link Pages" }],
  }),
  component: EditorLayout,
});

const TABS = [
  { to: "/pages/$pageId", label: "Links", id: "links", exact: true },
  { to: "/pages/$pageId/profile", label: "Profile", id: "profile" },
  { to: "/pages/$pageId/signups", label: "Sign-ups", id: "signups" },
  { to: "/pages/$pageId/analytics", label: "Analytics", id: "analytics" },
  { to: "/pages/$pageId/qr", label: "QR code", id: "qr" },
] as const;

function EditorLayout() {
  const page = Route.useLoaderData();
  const { run, pending } = useAction();

  if (!page) {
    return (
      <AppShell nav={<AppNav />}>
        <div data-testid="page-missing">
          <EmptyState
            kind="filtered"
            title="Page not found"
            action={
              <Button variant="outline" render={<Link to="/" />}>
                My pages
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title={page.name}
        description={
          page.published ? (
            <a
              href={page.publicUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="public-url"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              {page.publicUrl}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <span data-testid="public-url">{page.publicUrl}</span>
          )
        }
        actions={
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              data-testid="published-switch"
              checked={page.published}
              disabled={pending}
              onCheckedChange={(published) =>
                run(() => setPublished({ data: { pageId: page.id, published } }))
              }
            />
            {page.published ? "Published" : "Not published"}
          </label>
        }
      />
      <nav className="-mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            params={{ pageId: page.id }}
            activeOptions={{ exact: "exact" in tab }}
            data-testid={`tab-${tab.id}`}
            className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-medium data-[status=active]:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </AppShell>
  );
}
