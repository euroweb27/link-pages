import { Link } from "@tanstack/react-router";

/** The app's own links in the AppShell bar. */
export function AppNav({ admin }: { admin?: boolean }) {
  const link =
    "text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground";
  return (
    <nav className="flex items-center gap-4">
      <Link to="/" className={link} activeOptions={{ exact: true }}>
        My pages
      </Link>
      {admin ? (
        <Link to="/admin" className={link} data-testid="nav-admin">
          All pages
        </Link>
      ) : null}
    </nav>
  );
}
