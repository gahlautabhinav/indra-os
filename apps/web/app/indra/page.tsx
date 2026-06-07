"use client";

export default function WorkforceDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="label-caps mb-1">Command Layer</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
          Workforce Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Mission control for your AI civilization
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {/* MetricTiles will be populated in Phase 1 */}
        <div className="domain-panel p-4" data-domain="indra">
          <p className="label-caps mb-2">Active Agents</p>
          <p className="metric-value font-mono" data-metric>0</p>
        </div>
        <div className="domain-panel p-4" data-domain="rudra">
          <p className="label-caps mb-2">Running Tasks</p>
          <p className="metric-value font-mono" data-metric>0</p>
        </div>
        <div className="domain-panel p-4" data-domain="vasu">
          <p className="label-caps mb-2">Token Burn / hr</p>
          <p className="metric-value font-mono" data-metric>0</p>
        </div>
        <div className="domain-panel p-4" data-domain="aditya">
          <p className="label-caps mb-2">System Health</p>
          <p className="metric-value font-mono text-healthy" data-metric>—</p>
        </div>
      </div>
    </div>
  );
}
