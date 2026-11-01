import { Fragment } from "react";

// AI replies arrive with light markdown (## headings, **bold**, - bullets).
// Shown as plain text those marks appeared literally ("## 💚 What You
// Shared", "**lemon water**"). This renders just that small subset as real
// formatting — built as React elements, never as HTML, so nothing in a reply
// can inject markup.

function inline(text, keyBase) {
  // **bold** (and __bold__); a lone * or _ is left as it is
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((p, i) =>
    /^(\*\*|__)[^*_]+(\*\*|__)$/.test(p)
      ? <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>
      : <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>
  );
}

export default function RichText({ text, style }) {
  const lines = String(text || "").split("\n");
  return (
    <div style={style}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        const heading = /^#{1,6}\s+(.*)$/.exec(line);
        if (heading) {
          return <div key={i} style={{ fontWeight: 700, marginTop: i ? 10 : 0 }}>{inline(heading[1], i)}</div>;
        }
        const bullet = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 4 }}>
              <span aria-hidden>•</span>
              <span>{inline(bullet[1], i)}</span>
            </div>
          );
        }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) return <div key={i} style={{ height: 8 }} />;
        return <div key={i} style={{ minHeight: line ? undefined : 8 }}>{inline(line, i)}</div>;
      })}
    </div>
  );
}
