export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; code?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const params = await searchParams;
  const inactive = params.error === "inactive" || params.code === "inactive";
  const callbackUrl = params.callbackUrl || "/";

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: callbackUrl,
      });
    } catch (error) {
      if (error instanceof CredentialsSignin && error.code === "inactive") {
        redirect("/login?error=inactive");
      }
      if (error instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-md pt-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Court Booking <span className="text-slate-400">(pilot)</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo Club · sample data
        </p>
      </div>

      <form
        action={loginAction}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue="admin@democlub.local"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            defaultValue="password123"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>

        {inactive ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This account is not active. A club admin needs to approve it before you can sign in.
          </p>
        ) : params.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid email or password.
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Log in
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Seeded logins</p>
        <ul className="mt-1 space-y-0.5 font-mono">
          <li>admin@democlub.local / password123 (admin)</li>
          <li>director@democlub.local / password123 (director)</li>
          <li>member@democlub.local / password123</li>
          <li>member2@democlub.local / password123</li>
        </ul>
      </div>
    </div>
  );
}
