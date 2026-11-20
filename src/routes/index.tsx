import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { errorMessage } from "@/client/lib/useAction";
import { createPage, getMyPages } from "@/serverFunctions/pages";

export const Route = createFileRoute("/")({
  loader: () => getMyPages(),
  head: () => ({ meta: [{ title: "Link Pages" }] }),
  component: Home,
});

function Home() {
  const { pages, admin } = Route.useLoaderData();
  const [creating, setCreating] = useState(false);
  const newPage = (
    <Button data-testid="new-page" onClick={() => setCreating(true)}>
      <Plus data-icon="inline-start" />
      New page
    </Button>
  );
  return (
    <AppShell nav={<AppNav admin={admin} />}>
      <PageHeader title="My pages" actions={pages.length > 0 ? newPage : null} />
      {pages.length === 0 ? (
        <EmptyState
          media="rows"
          title="No pages yet"
          description="Create a page, add your links, then publish it to share its address."
          action={newPage}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {pages.map((page) => (
            <li key={page.id} data-testid="page-row">
              <Link
                to="/pages/$pageId"
                params={{ pageId: page.id }}
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{page.name}</p>
                  <p className="truncate text-sm text-muted-foreground">/p/{page.handle}</p>
                </div>
                {page.published ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating ? <CreatePageDialog onClose={() => setCreating(false)} /> : null}
    </AppShell>
  );
}

function CreatePageDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const page = await createPage({ data: { handle, name } });
      await navigate({ to: "/pages/$pageId", params: { pageId: page.id } });
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="page-handle">Handle</FieldLabel>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">/p/</span>
                <Input
                  id="page-handle"
                  data-testid="page-handle"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="your-name"
                  autoComplete="off"
                  required
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="page-name">Name</FieldLabel>
              <Input
                id="page-name"
                data-testid="page-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            {error ? <FieldError data-testid="form-error">{error}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" data-testid="create-page-submit" pending={pending}>
              Create page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
