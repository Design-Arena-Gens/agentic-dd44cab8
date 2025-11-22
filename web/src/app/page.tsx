"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_PASSCODE = "LEKYA-OPS-2024";

export default function Home() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = typeof window !== "undefined" && localStorage.getItem("lekya.session");
    if (session) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const expected = process.env.NEXT_PUBLIC_MANAGER_KEY ?? DEFAULT_PASSCODE;
    if (passcode.trim() === expected) {
      localStorage.setItem(
        "lekya.session",
        JSON.stringify({
          role: "logistics-manager",
          authenticatedAt: new Date().toISOString(),
        }),
      );
      router.replace("/dashboard");
    } else {
      setError("Invalid manager passcode");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-slate-950 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Lekya Logistics</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Manager Access</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the secure passcode to access dispatch, live tracking, and finance controls.
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-300" htmlFor="passcode">
            Security Passcode
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base text-slate-100 shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Enter dispatch PIN"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
          >
            {loading ? "Authorising..." : "Unlock Console"}
          </button>
        </form>
        <p className="mt-8 text-center text-xs text-slate-500">
          Role restricted to Logistics Managers. All access is audited in real time.
        </p>
      </div>
    </div>
  );
}
