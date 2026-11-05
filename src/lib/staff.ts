import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminError } from "@/lib/admin-error";
import type { Role } from "@/lib/constants";

export type StaffActor = {
  id: string;
  email: string;
  name: string;
  role: Extract<Role, "ADMIN" | "DIRECTOR">;
  clubId: string;
};

function isStaffRole(role: string): role is StaffActor["role"] {
  return role === "ADMIN" || role === "DIRECTOR";
}

export async function requireStaff(): Promise<StaffActor> {
  const session = await auth();
  if (!session?.user?.id) throw new AdminError(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    throw new AdminError(401, "Unauthorized");
  }
  if (!isStaffRole(user.role)) throw new AdminError(403, "Forbidden");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clubId: user.clubId,
  };
}

export const getStaffContext = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: { include: { rules: true } } },
  });
  if (!user || user.status !== "ACTIVE") redirect("/logout");
  if (!isStaffRole(user.role)) redirect("/schedule");
  return user;
});

export async function requireActiveUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}
