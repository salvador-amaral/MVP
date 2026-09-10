import { requireOrg } from "@/server/data";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await requireOrg();
  return (
    <AppShell orgName={organization.name} userName={user.full_name}>
      {children}
    </AppShell>
  );
}
