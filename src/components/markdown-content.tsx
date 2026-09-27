import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function MarkdownContent({ markdown }: { markdown: string }) {
  const blocks = markdown.trim().split(/\n\s*\n/).filter(Boolean);

  return <div className="markdown-content">{blocks.map((block, index) => {
    const lines = block.split("\n");
    const heading = lines.length === 1 ? lines[0].match(/^(#{1,6})\s+(.+)$/) : null;
    if (heading) {
      const Heading = `h${heading[1].length}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={index}>{renderInline(heading[2])}</Heading>;
    }

    const ordered = lines.every(line => /^\d+\.\s+/.test(line));
    const unordered = lines.every(line => /^[-*+]\s+/.test(line));
    if (ordered || unordered) {
      const List = ordered ? "ol" : "ul";
      const marker = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/;
      return <List key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(marker, ""))}</li>)}</List>;
    }

    return <p key={index}>{renderInline(lines.join(" "))}</p>;
  })}</div>;
}
