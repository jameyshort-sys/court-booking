import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role;
        token.clubId = (user as { clubId?: string }).clubId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = String(token.role ?? "MEMBER");
        session.user.clubId = String(token.clubId ?? "");
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
