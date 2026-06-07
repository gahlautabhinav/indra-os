import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VivartaTrace } from "../VivartaTrace";
import type { TraceWithSpans } from "@indra/types";

function makeTrace(overrides: Partial<TraceWithSpans> = {}): TraceWithSpans {
  return {
    id: "uuid-001",
    trace_id: "trace-abc123def456",
    session_id: null,
    agent_id: null,
    name: "Test Trace",
    duration_ms: 500,
    status: "ok",
    started_at: "2024-01-15T10:00:00.000Z",
    finished_at: "2024-01-15T10:00:00.500Z",
    created_at: "2024-01-15T10:00:00.000Z",
    span_count: 2,
    spans: [],
    ...overrides,
  };
}

function makeSpan(id: string, parentId: string | null = null) {
  return {
    id: `uuid-${id}`,
    span_id: id,
    trace_id: "trace-abc123def456",
    parent_span_id: parentId,
    name: `span-${id}`,
    kind: "internal" as const,
    status: "ok" as const,
    duration_ms: 100,
    attributes: {},
    events: [],
    started_at: "2024-01-15T10:00:00.000Z",
    finished_at: "2024-01-15T10:00:00.100Z",
  };
}

describe("VivartaTrace", () => {
  it("renders VIVARTA label and trace_id", () => {
    const trace = makeTrace();
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText(/Vivarta/i)).toBeTruthy();
    expect(screen.getByText(/trace-abc123def456/i)).toBeTruthy();
  });

  it("shows empty spans message when no spans", () => {
    const trace = makeTrace({ spans: [] });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText(/No Spans/i)).toBeTruthy();
  });

  it("renders span rows for each span", () => {
    const trace = makeTrace({
      spans: [makeSpan("span-root"), makeSpan("span-child", "span-root")],
    });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText("span-span-root")).toBeTruthy();
    expect(screen.getByText("span-span-child")).toBeTruthy();
  });

  it("renders status pill", () => {
    const trace = makeTrace({ status: "ok" });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("renders error status", () => {
    const trace = makeTrace({ status: "error" });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText("ERROR")).toBeTruthy();
  });

  it("renders duration in ms", () => {
    const trace = makeTrace({ duration_ms: 500 });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText("500ms")).toBeTruthy();
  });

  it("renders duration in seconds for >1000ms", () => {
    const trace = makeTrace({ duration_ms: 2500 });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText("2.50s")).toBeTruthy();
  });

  it("renders span count", () => {
    const trace = makeTrace({
      spans: [makeSpan("s1"), makeSpan("s2")],
    });
    render(<VivartaTrace trace={trace} />);
    expect(screen.getByText(/2 spans/i)).toBeTruthy();
  });

  it("renders compact strip row in compact mode", () => {
    const trace = makeTrace({ spans: [makeSpan("s1")] });
    const { container } = render(<VivartaTrace trace={trace} compact />);
    // Compact mode renders a simple div row, not the full panel
    expect(container.querySelector("[style*='border-top']")).toBeNull();
  });

  it("renders timestamp footer when started_at present", () => {
    const trace = makeTrace({
      spans: [makeSpan("s1")],
      started_at: "2024-01-15T10:00:00.000Z",
    });
    render(<VivartaTrace trace={trace} />);
    // Footer shows "Started" text
    expect(screen.getByText(/Started/)).toBeTruthy();
  });
});
