"use client";

import { Fragment, type ReactNode } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useVaultNote } from "@/lib/api/hooks";

const ADITYA = "#3a80d4";

// ── light markdown rendering ────────────────────────────────────────────────
// graphify notes are simple: headings, bold, inline code, [[wikilinks]], #tags,
// list items, horizontal rules. We render to React nodes (never raw HTML) so
// there's no injection surface.

function renderInline(text: string, onWiki?: (target: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  // Split on the tokens we care about, keeping the delimiters.
  const re = /(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|#[A-Za-z0-9/_-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("[[")) {
      const inner = tok.slice(2, -2);
      const [target, alias] = inner.split("|");
      out.push(
        <button
          key={key++}
          onClick={() => onWiki?.(target!.trim())}
          className="rounded px-1 font-medium hover:underline"
          style={{ color: ADITYA }}
        >
          {(alias ?? target)!.trim()}
        </button>
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key++} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12px] text-ink-secondary">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**")) {
      out.push(
        <strong key={key++} className="font-semibold text-ink-primary">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("#")) {
      out.push(
        <span key={key++} className="font-mono text-[11px] text-ink-ghost">
          {tok}
        </span>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return out;
}

function renderMarkdown(body: string, onWiki?: (target: string) => void): ReactNode {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  let k = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${k++}`} className="my-2 space-y-1 pl-4">
          {list}
        </ul>
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={`hr-${k++}`} className="my-3 border-hairline" />);
    } else if (line.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={`h-${k++}`} className="mt-3 text-[13px] font-semibold text-ink-secondary">{renderInline(line.slice(4), onWiki)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={`h-${k++}`} className="mt-4 text-sm font-semibold text-ink-primary">{renderInline(line.slice(3), onWiki)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h1 key={`h-${k++}`} className="mb-1 text-lg font-bold tracking-tight text-ink-primary">{renderInline(line.slice(2), onWiki)}</h1>);
    } else if (/^[-*]\s+/.test(line)) {
      list.push(<li key={`li-${k++}`} className="list-disc text-[13px] text-ink-tertiary">{renderInline(line.replace(/^[-*]\s+/, ""), onWiki)}</li>);
    } else {
      flushList();
      blocks.push(<p key={`p-${k++}`} className="text-[13px] leading-relaxed text-ink-tertiary">{renderInline(line, onWiki)}</p>);
    }
  }
  flushList();
  return blocks;
}

export function NoteReader({
  vaultId,
  vaultName,
  name,
  onWiki,
}: {
  vaultId: string;
  vaultName: string;
  name: string | null;
  onWiki?: (target: string) => void;
}) {
  const { data, isLoading, isError } = useVaultNote(vaultId, name);

  if (!name) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-ghost">
        <FileText className="h-6 w-6 opacity-40" />
        <p className="text-xs">Select a note to read it.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-4 text-xs text-ink-ghost">Loading note…</div>;
  }
  if (isError || !data) {
    return (
      <div className="p-4 text-xs text-ink-ghost">
        Couldn&apos;t open <span className="font-mono text-ink-tertiary">{name}</span>.
      </div>
    );
  }

  // obsidian://open?vault=<name>&file=<stem> — deep-links into the Obsidian app.
  const obsidianUri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(data.stem)}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2">
        <FileText className="h-3.5 w-3.5 text-ink-tertiary" />
        <span className="truncate font-mono text-[11px] text-ink-secondary">{data.name}</span>
        <a
          href={obsidianUri}
          className="ml-auto flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[10px] text-ink-tertiary hover:text-ink-secondary"
          title="Open in Obsidian"
        >
          <ExternalLink className="h-3 w-3" /> Open in Obsidian
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {renderMarkdown(data.body, onWiki)}
        {data.truncated && (
          <p className="mt-3 rounded border border-hairline bg-surface-2 px-2 py-1 text-[10px] text-ink-ghost">
            Note truncated — open in Obsidian to read the rest.
          </p>
        )}
      </div>
    </div>
  );
}
