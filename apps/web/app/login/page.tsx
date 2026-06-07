"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { indraApi } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await indraApi.login(email, password);
      localStorage.setItem("indra_token", access_token);
      router.replace("/indra");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-2xl font-bold tracking-[0.2em] text-accent uppercase">INDRA</span>
            <span className="text-lg text-ink-ghost font-mono">इन्द्रः</span>
          </div>
          <p className="text-sm text-ink-secondary">Agentic Operating System</p>
          <p className="text-xs text-ink-ghost font-mono">Sign in to your command layer</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface-1 border border-hairline rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="label-caps text-ink-ghost block">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="input-field w-full"
              placeholder="admin@indra.os"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-caps text-ink-ghost block">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="input-field w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-critical font-mono border border-critical/30 bg-critical/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                Authenticating…
              </>
            ) : (
              "Enter INDRA"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink-ghost font-mono">
          Create account via CLI: <code className="text-accent">py -3.14 -m indra.cli create-user</code>
        </p>
      </div>
    </div>
  );
}
