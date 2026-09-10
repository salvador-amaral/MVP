import { createClient } from "@/lib/supabase/server";
import { requireUser, getCurrentOrganization } from "@/server/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { InviteMemberForm } from "@/components/settings/invite-member-form";
import { DeleteOrganizationForm } from "@/components/settings/delete-organization-form";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { ReminderSettings } from "@/types/database";

export default async function SettingsPage() {
  const user = await requireUser();
  const org = await getCurrentOrganization(user.id);
  if (!org) return null;

  const canInvite = user.role === "owner" || user.role === "admin";
  const isOwner = user.role === "owner";

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Definições"
        description="Organização, lembretes automáticos e perfil."
      />

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organização</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgSettingsForm
              defaultName={org.name}
              defaultReplyTo={org.reply_to_email}
              reminderSettings={org.reminder_settings as ReminderSettings}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipa</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y">
            {(members ?? []).map((member) => (
              <li key={member.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">
                    {member.full_name || member.email}
                  </div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {USER_ROLE_LABELS[member.role as keyof typeof USER_ROLE_LABELS]}
                </span>
              </li>
            ))}
          </ul>
          {canInvite ? <InviteMemberForm /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">O meu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={user.full_name} />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Zona de perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Elimina definitivamente a organização, os clientes, os pedidos,
              os modelos e <strong>todos os ficheiros carregados</strong>. As
              contas da equipa são removidas e ninguém poderá voltar a entrar.
              Esta ação não pode ser revertida.
            </p>
            <p className="text-sm text-muted-foreground">
              Para evitar acidentes, nada é eliminado de imediato: enviámos uma
              ligação de confirmação para o email do proprietário, e só essa
              ligação conclui a eliminação.
            </p>
            <DeleteOrganizationForm organizationName={org.name} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
