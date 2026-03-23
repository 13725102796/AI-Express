import { cn } from "@/lib/utils";

export type FileFormat = "pdf" | "word" | "web" | "markdown" | "txt" | "csv" | "image";

export interface FileFormatIconProps {
  format: FileFormat;
  size?: number;
  className?: string;
}

const formatConfig: Record<FileFormat, { color: string; label: string }> = {
  pdf: { color: "var(--color-fmt-pdf)", label: "PDF" },
  word: { color: "var(--color-fmt-word)", label: "DOC" },
  web: { color: "var(--color-fmt-web)", label: "WEB" },
  markdown: { color: "var(--color-fmt-md)", label: "MD" },
  txt: { color: "var(--color-fmt-txt)", label: "TXT" },
  csv: { color: "var(--color-fmt-web)", label: "CSV" },
  image: { color: "var(--color-fmt-pdf)", label: "IMG" },
};

export function FileFormatIcon({ format, size = 20, className }: FileFormatIconProps) {
  const config = formatConfig[format] || formatConfig.txt;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("flex-shrink-0", className)}
      aria-label={`${config.label} 文件`}
    >
      <rect x="3" y="1" width="18" height="22" rx="3" fill={config.color} opacity="0.12" />
      <rect x="3" y="1" width="18" height="22" rx="3" stroke={config.color} strokeWidth="1.5" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fill={config.color}
        fontSize="6.5"
        fontWeight="700"
        fontFamily="var(--font-code)"
      >
        {config.label}
      </text>
    </svg>
  );
}
