import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "./password";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: NINETY_DAYS_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        if (!checkRateLimit(`login:${email}`)) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user) return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        resetRateLimit(`login:${email}`);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id as string;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
