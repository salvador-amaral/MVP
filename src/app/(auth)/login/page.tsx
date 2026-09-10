import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; eliminado?: string }>;
}) {
  const { next, eliminado } = await searchParams;
  return (
    <>
      {eliminado === "1" ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          A organização e todos os dados associados foram eliminados
          definitivamente. Obrigado por ter usado o PrepApp.
        </p>
      ) : null}
      <LoginForm next={next ?? "/dashboard"} />
    </>
  );
}
