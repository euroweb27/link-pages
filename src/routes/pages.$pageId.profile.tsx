import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/client/components/ui/toggle-group";
import { errorMessage, useAction } from "@/client/lib/useAction";
import { removeAvatar, updateProfile, uploadAvatar } from "@/serverFunctions/pages";

export const Route = createFileRoute("/pages/$pageId/profile")({
  component: Profile,
});

const parent = getRouteApi("/pages/$pageId");

function Profile() {
  const page = parent.useLoaderData();
  if (!page) return null;
  return (
    <div className="space-y-8">
      <Avatar pageId={page.id} url={page.avatarUrl} name={page.name} />
      <ProfileForm key={page.id} page={page} />
    </div>
  );
}

function Avatar({ pageId, url, name }: { pageId: string; url: string | null; name: string }) {
  const { run, pending } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const form = new FormData();
    form.set("pageId", pageId);
    form.set("file", file);
    try {
      await uploadAvatar({ data: form });
      await run(async () => undefined);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <section className="flex items-center gap-4">
      {url ? (
        <img
          src={url}
          alt=""
          data-testid="avatar-preview"
          className="size-20 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full border border-dashed border-border bg-muted text-2xl font-semibold text-muted-foreground">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => input.current?.click()}>
            <ImageUp data-icon="inline-start" />
            {url ? "Replace picture" : "Upload picture"}
          </Button>
          {url ? (
            <Button
              variant="ghost"
              data-testid="avatar-remove"
              pending={pending}
              onClick={() => run(() => removeAvatar({ data: { pageId } }))}
            >
              <Trash2 data-icon="inline-start" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">PNG, JPEG or WebP, up to 2 MB.</p>
        {error ? (
          <p data-testid="avatar-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          data-testid="avatar-input"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
    </section>
  );
}

type ProfilePage = NonNullable<ReturnType<typeof parent.useLoaderData>>;

function ProfileForm({ page }: { page: ProfilePage }) {
  const { run } = useAction();
  const [handle, setHandle] = useState(page.handle);
  const [name, setName] = useState(page.name);
  const [bio, setBio] = useState(page.bio);
  const [theme, setTheme] = useState(page.theme);
  const [buttons, setButtons] = useState(page.buttons);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await updateProfile({ data: { pageId: page.id, handle, name, bio, theme, buttons } });
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
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      onChange={() => setSaved(false)}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input
            id="profile-name"
            data-testid="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
          <Textarea
            id="profile-bio"
            data-testid="profile-bio"
            value={bio}
            maxLength={300}
            rows={3}
            onChange={(event) => setBio(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-handle">Handle</FieldLabel>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">/p/</span>
            <Input
              id="profile-handle"
              data-testid="profile-handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              autoComplete="off"
              required
            />
          </div>
          {handle !== page.handle ? (
            <p className="text-sm text-muted-foreground">
              The old address and QR code stop working.
            </p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel>Background</FieldLabel>
          <ToggleGroup
            variant="outline"
            value={[theme]}
            onValueChange={(value) => value[0] && setTheme(value[0] as typeof theme)}
          >
            <ToggleGroupItem value="light" data-testid="theme-light">
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" data-testid="theme-dark">
              Dark
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel>Buttons</FieldLabel>
          <ToggleGroup
            variant="outline"
            value={[buttons]}
            onValueChange={(value) => value[0] && setButtons(value[0] as typeof buttons)}
          >
            <ToggleGroupItem value="rounded" data-testid="shape-rounded">
              Rounded
            </ToggleGroupItem>
            <ToggleGroupItem value="square" data-testid="shape-square">
              Square
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        {error ? <FieldError data-testid="form-error">{error}</FieldError> : null}
      </FieldGroup>
      <div className="flex items-center gap-3">
        <Button type="submit" data-testid="profile-save" pending={pending}>
          Save
        </Button>
        {saved ? (
          <span data-testid="profile-saved" className="text-sm text-muted-foreground">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
