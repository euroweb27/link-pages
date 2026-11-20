import { Link, createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { getAnalytics } from "@/serverFunctions/analytics";

export const Route = createFileRoute("/pages/$pageId/analytics")({
  validateSearch: z.object({ days: z.union([z.literal(7), z.literal(30)]).optional() }),
  loaderDeps: ({ search }) => ({ days: search.days ?? 7 }),
  loader: ({ params, deps }) =>
    getAnalytics({ data: { pageId: params.pageId, days: deps.days } }),
  component: Analytics,
});

const chartConfig = {
  views: { label: "Views", color: "var(--chart-1)" },
  clicks: { label: "Clicks", color: "var(--chart-2)" },
} satisfies ChartConfig;

function Analytics() {
  const data = Route.useLoaderData();
  if (!data) return null;
  const percent = `${(data.ctr * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {([7, 30] as const).map((days) => (
          <Link
            key={days}
            from={Route.fullPath}
            search={{ days }}
            data-testid={`range-${days}`}
            data-active={data.days === days}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-muted data-[active=true]:font-medium data-[active=true]:text-foreground"
          >
            Last {days} days
          </Link>
        ))}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <Stat label="Views" value={String(data.views)} id="stat-views" />
        <Stat label="Clicks" value={String(data.clicks)} id="stat-clicks" />
        <Stat label="Click rate" value={percent} id="stat-ctr" />
      </dl>

      <section className="rounded-xl border border-border bg-card p-4 shadow-xs" data-testid="views-chart">
        <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
          <BarChart data={data.daily} margin={{ left: -20, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              tickFormatter={shortDay}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => shortDay(String(value))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="views" fill="var(--color-views)" radius={3} />
            <Bar dataKey="clicks" fill="var(--color-clicks)" radius={3} />
          </BarChart>
        </ChartContainer>
      </section>

      <Breakdown
        id="clicks-by-link"
        title="Clicks by link"
        column="Clicks"
        empty="No clicks yet"
        rows={data.byLink.map((row) => ({ key: row.itemId, name: row.title, value: row.clicks }))}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Breakdown
          id="top-sources"
          title="Top sources"
          column="Views"
          empty="No views yet"
          rows={data.sources.map((row) => ({ key: row.name, name: row.name, value: row.views }))}
        />
        <Breakdown
          id="top-countries"
          title="Top countries"
          column="Views"
          empty="No views yet"
          rows={data.countries.map((row) => ({ key: row.name, name: countryName(row.name), value: row.views }))}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, id }: { label: string; value: string; id: string }) {
  return (
    <div className="space-y-1 px-5 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd data-testid={id} className="text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function Breakdown({
  id,
  title,
  column,
  empty,
  rows,
}: {
  id: string;
  title: string;
  column: string;
  empty: string;
  rows: { key: string; name: string; value: number }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs" data-testid={id}>
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sr-only">Name</TableHead>
                <TableHead className="text-right">{column}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="max-w-0 truncate">{row.name}</TableCell>
                  <TableCell className="w-20 text-right tabular-nums">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function countryName(code: string): string {
  if (code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
