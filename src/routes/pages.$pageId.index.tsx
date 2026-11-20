import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Heading, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
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
import { Switch } from "@/client/components/ui/switch";
import { formatDateTime, fromLocalInput, toLocalInput } from "@/client/lib/dates";
import { errorMessage, useAction } from "@/client/lib/useAction";
import {
  createItem,
  deleteItem,
  getItems,
  moveItem,
  setItemEnabled,
  updateItem,
} from "@/serverFunctions/items";
import type { Item } from "@/server/items";

export const Route = createFileRoute("/pages/$pageId/")({
  loader: ({ params }) => getItems({ data: { pageId: params.pageId } }),
  component: Links,
});

const parent = getRouteApi("/pages/$pageId");

type Editing = { kind: "link" | "header"; item?: Item };

function Links() {
  const page = parent.useLoaderData();
  const items = Route.useLoaderData();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  if (!page) return null;

  const addButtons = (
    <div className="flex gap-2">
      <Button data-testid="add-link" onClick={() => setEditing({ kind: "link" })}>
        <Plus data-icon="inline-start" />
        Add link
      </Button>
      <Button variant="outline" data-testid="add-header" onClick={() => setEditing({ kind: "header" })}>
        <Heading data-icon="inline-start" />
        Add header
      </Button>
    </div>
  );

  return (
    <section className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          media="rows"
          icon={Link2}
          title="No links yet"
          description="Links and headers you add show on the page in this order."
          action={addButtons}
        />
      ) : (
        <>
          {addButtons}
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {items.map((item, index) => (
              <li
                key={item.id}
                data-testid="item-row"
                data-item-id={item.id}
                className="flex items-center gap-2 py-3 pr-3 pl-2"
              >
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${item.title} up`}
                    data-testid="item-up"
                    disabled={index === 0 || pending}
                    onClick={() => run(() => moveItem({ data: { itemId: item.id, direction: "up" } }))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${item.title} down`}
                    data-testid="item-down"
                    disabled={index === items.length - 1 || pending}
                    onClick={() => run(() => moveItem({ data: { itemId: item.id, direction: "down" } }))}
                  >
                    <ArrowDown />
                  </Button>
                </div>
                <div className={item.enabled ? "min-w-0 flex-1" : "min-w-0 flex-1 opacity-60"}>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === "header" ? (
                      <span className="font-semibold">{item.title}</span>
                    ) : (
                      <span className="font-medium">{item.title}</span>
                    )}
                    {item.kind === "header" ? <Badge variant="secondary">Header</Badge> : null}
                    {item.featured ? <Badge variant="soft">Featured</Badge> : null}
                    <ScheduleBadge item={item} />
                  </div>
                  {item.url ? (
                    <p className="truncate text-sm text-muted-foreground">{item.url}</p>
                  ) : null}
                </div>
                <Switch
                  data-testid="item-enabled"
                  aria-label={`Show ${item.title}`}
                  checked={item.enabled}
                  onCheckedChange={(enabled) =>
                    run(() => setItemEnabled({ data: { itemId: item.id, enabled } }))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${item.title}`}
                  data-testid="item-edit"
                  onClick={() => setEditing({ kind: item.kind, item })}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${item.title}`}
                  data-testid="item-delete"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleting(item)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {editing ? (
        <ItemDialog pageId={page.id} editing={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await run(() => deleteItem({ data: { itemId: deleting.id } }));
            setDeleting(null);
          }}
        >
          {deleting.kind === "link" ? "Its click counts are deleted too." : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

function ScheduleBadge({ item }: { item: Item }) {
  if (item.kind !== "link" || (!item.startsAt && !item.endsAt)) return null;
  const now = new Date();
  if (item.endsAt && new Date(item.endsAt) <= now) {
    return <Badge variant="outline">Ended {formatDateTime(item.endsAt)}</Badge>;
  }
  if (item.startsAt && new Date(item.startsAt) > now) {
    return <Badge variant="warning">From {formatDateTime(item.startsAt)}</Badge>;
  }
  return item.endsAt ? <Badge variant="info">Until {formatDateTime(item.endsAt)}</Badge> : null;
}

function ItemDialog({
  pageId,
  editing,
  onClose,
}: {
  pageId: string;
  editing: Editing;
  onClose: () => void;
}) {
  const { run } = useAction();
  const { item, kind } = editing;
  const link = kind === "link";
  const [title, setTitle] = useState(item?.title ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [startsAt, setStartsAt] = useState(toLocalInput(item?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(item?.endsAt ?? null));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setPending(true);
    const fields = link
      ? {
          title,
          url,
          featured,
          startsAt: fromLocalInput(startsAt),
          endsAt: fromLocalInput(endsAt),
        }
      : { title };
    try {
      await (item
        ? updateItem({ data: { itemId: item.id, ...fields } })
        : createItem({ data: { pageId, kind, ...fields } }));
      await run(async () => undefined);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  const noun = link ? "link" : "header";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>{item ? `Edit ${noun}` : `Add ${noun}`}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="item-title">Title</FieldLabel>
              <Input
                id="item-title"
                data-testid="item-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </Field>
            {link ? (
              <>
                <Field>
                  <FieldLabel htmlFor="item-url">URL</FieldLabel>
                  <Input
                    id="item-url"
                    data-testid="item-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://"
                    inputMode="url"
                    required
                  />
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="item-featured"
                    data-testid="item-featured"
                    checked={featured}
                    onCheckedChange={setFeatured}
                  />
                  <FieldLabel htmlFor="item-featured">Featured, shown larger</FieldLabel>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="item-starts">Show from</FieldLabel>
                    <Input
                      id="item-starts"
                      type="datetime-local"
                      data-testid="item-starts"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="item-ends">Show until</FieldLabel>
                    <Input
                      id="item-ends"
                      type="datetime-local"
                      data-testid="item-ends"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                    />
                  </Field>
                </div>
              </>
            ) : null}
            {error ? <FieldError data-testid="form-error">{error}</FieldError> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" data-testid="item-save" pending={pending}>
              {item ? "Save" : `Add ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
