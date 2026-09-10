export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header is rendered per-request inside the page so it can show the
  // accounting office's own name on the client portal.
  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
