import { auth } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Iron Log</h1>
      <p className="text-sm text-muted-foreground">
        Sesión iniciada como{" "}
        <span className="text-foreground">{session?.user?.email}</span>
      </p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" size="touch">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}
