import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricTile } from "../MetricTile";

describe("MetricTile", () => {
  it("renders label and value", () => {
    render(<MetricTile label="Active Agents" value={42} />);
    expect(screen.getByText("Active Agents")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders unit next to value when provided", () => {
    render(<MetricTile label="Tokens" value={1500} unit="tok" />);
    expect(screen.getByText("tok")).toBeTruthy();
  });

  it("shows loading skeleton when loading=true", () => {
    const { container } = render(
      <MetricTile label="Loading" value={0} loading />
    );
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toBeTruthy();
  });

  it("does not show skeleton when loading=false", () => {
    const { container } = render(
      <MetricTile label="Ready" value={99} loading={false} />
    );
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toBeNull();
  });

  it("renders delta indicator with positive sign", () => {
    render(<MetricTile label="Cost" value="$1.20" delta={5} deltaLabel="vs yesterday" />);
    expect(screen.getByText(/\+5/)).toBeTruthy();
    expect(screen.getByText(/vs yesterday/)).toBeTruthy();
  });

  it("renders delta indicator with negative sign", () => {
    render(<MetricTile label="Cost" value="$0.50" delta={-3} />);
    expect(screen.getByText(/↓/)).toBeTruthy();
  });

  it("applies correct data-domain attribute", () => {
    const { container } = render(
      <MetricTile label="Tasks" value={10} domain="rudra" />
    );
    const panel = container.querySelector("[data-domain='rudra']");
    expect(panel).toBeTruthy();
  });
});
