import { Link, createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { useAction } from "@/client/lib/useAction";
import { adminUnpublish, getAllPages } from "@/serverFunctions/pages";

export const Route = createFileRoute("/admin")({
  loader: () => getAllPages(),
  head: () => ({ meta: [{ title: "All pages · Link Pages" }] }),
  component: Admin,
});

function Admin() {
  const { admin, pages } = Route.useLoaderData();
  const { run, pending } = useAction();
  const [target, setTarget] = useState<{ id: string; handle: string } | null>(null);

  return (
    <AppShell nav={<AppNav admin={admin} />}>
      <PageHeader title="All pages" />
      {!admin ? (
        <div data-testid="admin-only">
          <EmptyState
            icon={ShieldAlert}
            title="Admins only"
            action={
              <Button variant="outline" render={<Link to="/" />}>
                My pages
              </Button>
            }
          />
        </div>
      ) : pages.length === 0 ? (
        <EmptyState title="No pages yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} data-testid="admin-row">
                  <TableCell>
                    <p className="font-medium">{page.name}</p>
                    <p className="text-muted-foreground">/p/{page.handle}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{page.ownerEmail ?? "—"}</TableCell>
                  <TableCell>
                    {page.published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {page.published ? (
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid="admin-unpublish"
                        onClick={() => setTarget({ id: page.id, handle: page.handle })}
                      >
                        Unpublish
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {target ? (
        <ConfirmDialog
          title={`Unpublish /p/${target.handle}?`}
          confirmLabel="Unpublish"
          destructive
          pending={pending}
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await run(() => adminUnpublish({ data: { pageId: target.id } }));
            setTarget(null);
          }}
        >
          Visitors get a not-found page until its owner publishes it again.
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}
