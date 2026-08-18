import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar — Iron Log" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-2xl font-bold text-foreground">Iron Log</h1>
      <LoginForm from={from || "/"} />
    </main>
  );
}
