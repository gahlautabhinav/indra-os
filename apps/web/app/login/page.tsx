"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { indraApi } from "@/lib/api/client";
import { DOMAINS } from "@/lib/devata";

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
    <div className="relative min-h-screen overflow-hidden bg-canvas text-ink-primary">
      {/* ── Cosmic backdrop ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.18] blur-[120px]"
          style={{ background: "radial-gradient(circle, var(--domain-rudra), transparent 70%)" }}
        />
        <div
          className="absolute right-[-10%] top-1/4 h-[600px] w-[600px] rounded-full opacity-[0.16] blur-[140px]"
          style={{ background: "radial-gradient(circle, var(--domain-indra), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-15%] left-1/3 h-[480px] w-[480px] rounded-full opacity-[0.14] blur-[130px]"
          style={{ background: "radial-gradient(circle, var(--domain-prajapati), transparent 70%)" }}
        />
        {/* fine starfield grid */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-stretch gap-0 lg:flex-row">
        {/* ── Left: brand / cosmology ── */}
        <section className="flex flex-1 flex-col justify-center gap-10 px-8 py-16 lg:px-14">
          <div>
            <div className="mb-3 flex items-baseline gap-4">
              <h1
                className="font-bold uppercase text-accent"
                style={{ fontSize: "44px", letterSpacing: "0.22em", lineHeight: 1 }}
              >
                INDRA
              </h1>
              <span
                className="font-mono text-ink-secondary"
                style={{ fontSize: "34px", lineHeight: 1 }}
              >
                इन्द्रः
              </span>
            </div>
            <p className="text-sm tracking-wide text-ink-secondary">
              The Operating System for AI Workforces
            </p>
            <p className="mt-1 font-mono text-xs text-ink-ghost">
              33 Devas · 5 Domains · One Sovereign
            </p>
          </div>

          {/* Domain ladder with Sanskrit names */}
          <div className="flex flex-col gap-px">
            {DOMAINS.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.id}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-surface-1/60 motion-safe:hover:translate-x-0.5"
                  style={{ borderLeft: `2px solid ${d.color}` }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    style={{ color: d.color, background: `${d.color}14` }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                    <span className="text-sm font-semibold tracking-wider">{d.label}</span>
                    <span className="font-mono text-sm text-ink-secondary">{d.sanskrit}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-ghost">
                    {d.tagline}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Right: auth ── */}
        <section className="flex w-full items-center justify-center px-8 py-16 lg:w-[440px] lg:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-ink-primary">Enter the Command Layer</h2>
              <p className="mt-1 text-xs text-ink-ghost">
                <span className="font-mono text-ink-tertiary">प्रवेशः</span> — authenticate to your sovereign
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border border-hairline bg-surface-1/80 p-6 backdrop-blur-sm"
              style={{ boxShadow: "var(--shadow-floating)" }}
            >
              <div className="space-y-1.5">
                <label className="label-caps block text-ink-ghost">
                  Email <span className="font-mono text-ink-tertiary">ईमेल</span>
                </label>
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

              <div className="space-y-1.5">
                <label className="label-caps block text-ink-ghost">
                  Password <span className="font-mono text-ink-tertiary">गुप्तशब्दः</span>
                </label>
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
                <p className="rounded border border-critical/30 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn-primary flex w-full items-center justify-center gap-2 transition motion-safe:active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    Authenticating…
                  </>
                ) : (
                  <>Enter INDRA · प्रविश</>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-ink-ghost">
              No account? Create one via CLI:
              <br />
              <code className="mt-1 inline-block font-mono text-accent">
                py -3.14 -m indra.cli create-user
              </code>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
