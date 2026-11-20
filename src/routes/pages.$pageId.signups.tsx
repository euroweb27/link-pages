import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Download, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Switch } from "@/client/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatDateTime } from "@/client/lib/dates";
import { errorMessage, useAction } from "@/client/lib/useAction";
import { updateSignupSettings } from "@/serverFunctions/pages";
import { deleteSignup, getSignups } from "@/serverFunctions/signups";

export const Route = createFileRoute("/pages/$pageId/signups")({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ params, deps }) =>
    getSignups({ data: { pageId: params.pageId, search: deps.q || undefined } }),
  component: Signups,
});

const parent = getRouteApi("/pages/$pageId");

function Signups() {
  const page = parent.useLoaderData();
  const rows = Route.useLoaderData();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { run, pending } = useAction();
  const [deleting, setDeleting] = useState<{ id: string; email: string } | null>(null);
  if (!page) return null;

  return (
    <div className="space-y-8">
      <FormSettings key={page.id} page={page} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Submissions</h2>
          <Button
            variant="outline"
            size="sm"
            data-testid="signup-download"
            render={<a href={`/api/pages/${page.id}/signups.csv`} download />}
          >
            <Download data-icon="inline-start" />
            Download CSV
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            data-testid="signup-search"
            aria-label="Search by email or name"
            placeholder="Search by email or name"
            className="bg-card pl-9"
            defaultValue={q}
            onChange={(event) =>
              navigate({ search: { q: event.target.value || undefined }, replace: true })
            }
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            kind={q ? "filtered" : "no-data"}
            title={q ? "No matches" : "No sign-ups yet"}
            description={q ? undefined : "Visitors who sign up on your page show here."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-testid="signup-row">
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{row.name ?? ""}</TableCell>
                    <TableCell>{row.phone ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(row.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${row.email}`}
                        data-testid="signup-delete"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting({ id: row.id, email: row.email })}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.email}?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await run(() => deleteSignup({ data: { signupId: deleting.id } }));
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}

type SettingsPage = NonNullable<ReturnType<typeof parent.useLoaderData>>;

function FormSettings({ page }: { page: SettingsPage }) {
  const { run } = useAction();
  const [enabled, setEnabled] = useState(page.signupEnabled);
  const [heading, setHeading] = useState(page.signupHeading);
  const [askDetails, setAskDetails] = useState(page.signupAskDetails);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await updateSignupSettings({ data: { pageId: page.id, enabled, heading, askDetails } });
      await run(async () => undefined);
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <FieldGroup>
        <Field orientation="horizontal">
          <Switch
            id="signup-enabled"
            data-testid="signup-enabled"
            checked={enabled}
            onCheckedChange={(value) => {
              setEnabled(value);
              setSaved(false);
            }}
          />
          <FieldLabel htmlFor="signup-enabled">Sign-up form on the page</FieldLabel>
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-heading">Heading</FieldLabel>
          <Input
            id="signup-heading"
            data-testid="signup-heading"
            value={heading}
            placeholder="Stay in touch"
            maxLength={120}
            onChange={(event) => {
              setHeading(event.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field orientation="horizontal">
          <Switch
            id="signup-ask-details"
            data-testid="signup-ask-details"
            checked={askDetails}
            onCheckedChange={(value) => {
              setAskDetails(value);
              setSaved(false);
            }}
          />
          <FieldLabel htmlFor="signup-ask-details">Also ask for name and phone</FieldLabel>
        </Field>
      </FieldGroup>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" data-testid="signup-save" pending={pending}>
          Save
        </Button>
        {saved ? (
          <span data-testid="signup-saved" className="text-sm text-muted-foreground">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
