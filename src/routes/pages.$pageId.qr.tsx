import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Spinner } from "@/client/components/ui/spinner";

export const Route = createFileRoute("/pages/$pageId/qr")({
  component: QrCode,
});

const parent = getRouteApi("/pages/$pageId");

/** The page's address tagged so scans count as the source "qr". */
function qrTarget(publicUrl: string): string {
  const url = new URL(publicUrl);
  url.searchParams.set("src", "qr");
  return url.toString();
}

function QrCode() {
  const page = parent.useLoaderData();
  const target = page ? qrTarget(page.publicUrl) : null;
  const [codes, setCodes] = useState<{ svg: string; png: string } | null>(null);

  useEffect(() => {
    if (!target) return;
    let live = true;
    const options = { errorCorrectionLevel: "M" as const, margin: 2 };
    void Promise.all([
      QRCode.toString(target, { ...options, type: "svg" }),
      QRCode.toDataURL(target, { ...options, width: 1024 }),
    ]).then(([svg, png]) => {
      if (live) setCodes({ svg, png });
    });
    return () => {
      live = false;
    };
  }, [target]);

  if (!page || !target) return null;
  return (
    <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-start">
      <div
        data-testid="qr-image"
        className="flex size-56 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border [&_svg]:size-full"
        // The SVG markup comes from the QR library, not from user input.
        dangerouslySetInnerHTML={codes ? { __html: codes.svg } : undefined}
      >
        {codes ? undefined : <Spinner />}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Opens</p>
          <p data-testid="qr-url" className="font-mono text-sm break-all">
            {target}
          </p>
        </div>
        {!page.published ? (
          <p className="text-sm text-muted-foreground">Scans show a not-found page until you publish.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            data-testid="qr-png"
            disabled={!codes}
            render={<a href={codes?.png} download={`${page.handle}-qr.png`} />}
          >
            <Download data-icon="inline-start" />
            PNG
          </Button>
          <Button
            variant="outline"
            data-testid="qr-svg"
            disabled={!codes}
            render={
              <a
                href={codes ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(codes.svg)}` : undefined}
                download={`${page.handle}-qr.svg`}
              />
            }
          >
            <Download data-icon="inline-start" />
            SVG
          </Button>
        </div>
      </div>
    </section>
  );
}
