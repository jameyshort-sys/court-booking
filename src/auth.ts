import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      clubId: string;
    };
  }

  interface User {
    role: string;
    clubId: string;
  }
}

class InactiveAccountError extends CredentialsSignin {
  constructor() {
    super();
    this.code = "inactive";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const users = await prisma.user.findMany({ where: { email } });
        if (users.length === 0) return null;

        const matches = [];
        for (const user of users) {
          if (!user.passwordHash) continue;
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (ok) matches.push(user);
        }
        if (matches.length > 1) return null;
        if (matches.length === 1) {
          const user = matches[0];
          if (user.status !== "ACTIVE") throw new InactiveAccountError();
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clubId: user.clubId,
          };
        }

        if (users.every((user) => user.status !== "ACTIVE")) {
          throw new InactiveAccountError();
        }
        return null;
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
});
