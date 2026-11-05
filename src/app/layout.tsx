import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Court Booking (pilot)",
  description: "Multi-club court booking SaaS — early scaffold",
  applicationName: "Court Booking",
  appleWebApp: {
    capable: true,
    title: "Court Booking",
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") redirect("/logout");
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <AppNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-400">
          Court Booking (pilot) · Demo Club · America/New_York
        </footer>
      </body>
    </html>
  );
}
