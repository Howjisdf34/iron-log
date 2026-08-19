import { auth } from "./index";

/** Server Actions: exige sesión antes de tocar cualquier dato de usuario. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session.user.id;
}
