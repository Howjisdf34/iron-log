import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@/server/auth";
import { db } from "@/db";
import { getOrCreateUserSettingsForUser } from "@/server/db/user-settings";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iron Log",
  description: "Gestor de rutinas de gimnasio con seguimiento granular por serie.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const theme = session?.user?.id
    ? (await getOrCreateUserSettingsForUser(db, session.user.id)).theme
    : "dark";

  return (
    <html
      lang="es"
      className={cn(
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
        theme === "dark" && "dark",
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
