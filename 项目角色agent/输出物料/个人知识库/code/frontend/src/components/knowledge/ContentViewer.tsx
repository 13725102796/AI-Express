"use client";

interface ContentViewerProps {
  content: string;
}

export function ContentViewer({ content }: ContentViewerProps) {
  // Simple markdown-like rendering
  const lines = content.split("\n");

  return (
    <div className="prose prose-sm max-w-none text-text-main">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-semibold text-text-main mt-6 mb-3">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-text-main mt-4 mb-2">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.trim() === "") {
          return <br key={i} />;
        }
        return (
          <p key={i} className="text-[15px] leading-[1.75] text-text-main mb-2">
            {line}
          </p>
        );
      })}
    </div>
  );
}
