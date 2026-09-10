import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "@/server/actions/clients";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm action={createClientAction} />
        </CardContent>
      </Card>
    </div>
  );
}
