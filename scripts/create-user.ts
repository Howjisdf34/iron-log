/**
 * CLI para crear uno de los 2 usuarios de Iron Log (sin registro público).
 * Uso: pnpm user:create --email tu@correo.com --password "algo-largo" --name "Tú"
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/server/auth/password";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg?.startsWith("--")) {
      out[arg.slice(2)] = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const password = args.password;
  const name = args.name?.trim();

  if (!email || !password || !name) {
    console.error(
      'Uso: pnpm user:create --email tu@correo.com --password "algo-largo" --name "Tú"',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.error(`Ya existe un usuario con ese email (${email}).`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, name, passwordHash })
    .returning({ id: users.id, email: users.email });

  console.log(`Usuario creado: ${created?.email} (${created?.id})`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
