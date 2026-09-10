"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/server/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialActionState);

  if (state.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Conta criada 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
          >
            Ir para o início de sessão
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta do escritório</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comece em 2 minutos. Sem cartão de crédito.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">O seu nome</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nome do escritório / empresa</Label>
            <Input
              id="organizationName"
              name="organizationName"
              placeholder="Ex.: Contabilidade Silva & Associados"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email profissional</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@escritorio.pt"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <FormMessage state={state} />
          <SubmitButton className="w-full">Criar conta</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciar sessão
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
