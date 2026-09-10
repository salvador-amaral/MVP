import Link from "next/link";
import { AlertTriangle, Clock, MailQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PortalError({ code }: { code: "not_found" | "expired" | "not_open" }) {
  const copy = {
    not_found: {
      icon: MailQuestion,
      title: "Ligação não encontrada",
      text: "Esta ligação não é válida. Verifique se copiou o endereço completo do email que recebeu.",
    },
    expired: {
      icon: Clock,
      title: "Ligação expirada",
      text: "Esta ligação expirou por segurança. Peça ao seu contabilista para lhe enviar uma nova.",
    },
    not_open: {
      icon: AlertTriangle,
      title: "Pedido ainda não enviado",
      text: "Este pedido ainda não foi ativado. Contacte o seu contabilista para obter acesso.",
    },
  }[code];

  const Icon = copy.icon;

  return (
    <Card className="mx-auto mt-8 max-w-md">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.text}</p>
        <Link
          href="/"
          className="mt-2 text-sm text-primary hover:underline"
          onClick={(e) => e.preventDefault()}
        >
          Esta é uma página segura de preparação de documentos.
        </Link>
      </CardContent>
    </Card>
  );
}
