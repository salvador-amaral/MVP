"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/server/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";

const EMAIL_KEY = "prep.remember.email";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInAction, initialActionState);
  // Controlled values: the email stays put no matter what happens in the
  // password field or on a failed attempt.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // Prefill the remembered email after mount (client-only, avoids SSR mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  function toggleRemember(value: boolean) {
    setRemember(value);
    try {
      if (value && email) window.localStorage.setItem(EMAIL_KEY, email);
      else window.localStorage.removeItem(EMAIL_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Iniciar sessão</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aceda à área do seu escritório.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@escritorio.pt"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (remember) {
                  try {
                    window.localStorage.setItem(EMAIL_KEY, e.target.value);
                  } catch {
                    /* ignore */
                  }
                }
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-primary"
              checked={remember}
              onChange={(e) => toggleRemember(e.target.checked)}
            />
            Lembrar-me — manter sessão iniciada neste dispositivo
          </label>

          <FormMessage state={state} />
          <SubmitButton className="w-full">Entrar</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
