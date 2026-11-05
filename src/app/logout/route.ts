import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  let inactive = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });
    inactive = !user || user.status !== "ACTIVE";
  }
  await signOut({
    redirectTo: inactive ? "/login?error=inactive" : "/login",
  });
}
