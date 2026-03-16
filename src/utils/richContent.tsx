import { Fragment, type ReactNode } from "react";
import type { RichTextFormat } from "../types";

const MARKDOWN = "MARKDOWN";
const PLAIN = "PLAIN";
const MARKDOWN_IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i;
const TOKEN_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i;

type ParsedBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string }
  | { type: "youtube"; embedUrl: string };

type NormalizedRichTextFormat = typeof MARKDOWN | typeof PLAIN;

export function richContentToPlainText(
  content: string | null | undefined,
  format: RichTextFormat | string | null | undefined,
): string {
  const normalizedContent = typeof content === "string" ? content : "";
  if (!normalizedContent.trim()) return "";

  if (toRichTextFormat(format) === PLAIN) {
    return normalizedContent.replace(/\s+/g, " ").trim();
  }

  return normalizedContent
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function RichContentRenderer({
  content,
  format,
  className,
  paragraphClassName,
  linkClassName,
}: {
  content: string | null | undefined;
  format: RichTextFormat | string | null | undefined;
  className?: string;
  paragraphClassName?: string;
  linkClassName?: string;
}) {
  const blocks = parseBlocks(content ?? "", toRichTextFormat(format));
  if (!blocks.length) return null;

  const effectiveContainerClass = className ?? "space-y-4";
  const effectiveParagraphClass =
    paragraphClassName ??
    "text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-6";
  const effectiveLinkClass =
    linkClassName ?? "text-primary dark:text-accent underline underline-offset-2";

  return (
    <div className={effectiveContainerClass}>
      {blocks.map((block, index) => {
        if (block.type === "image") {
          return (
            <figure key={`image-${index}`} className="space-y-2">
              <img
                src={block.url}
                alt={block.alt || "Embedded image"}
                className="w-full rounded-lg border border-gray-100 dark:border-gray-700 object-cover max-h-[420px]"
                loading="lazy"
              />
              {block.alt && (
                <figcaption className="text-xs text-gray-500 dark:text-gray-400">{block.alt}</figcaption>
              )}
            </figure>
          );
        }

        if (block.type === "youtube") {
          return (
            <div key={`youtube-${index}`} className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700 bg-black">
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src={block.embedUrl}
                  title={`YouTube video ${index + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          );
        }

        const lines = block.text.split(/\r?\n/);
        return (
          <p key={`paragraph-${index}`} className={effectiveParagraphClass}>
            {lines.map((line, lineIndex) => (
              <Fragment key={`line-${index}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInlineSegments(line, `seg-${index}-${lineIndex}`, effectiveLinkClass)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function toRichTextFormat(format: RichTextFormat | string | null | undefined): NormalizedRichTextFormat {
  if (typeof format === "string" && format.trim().toUpperCase() === PLAIN) {
    return PLAIN;
  }
  return MARKDOWN;
}

function parseBlocks(content: string, format: NormalizedRichTextFormat): ParsedBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];
  const paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join("\n").trim();
    paragraphLines.length = 0;
    if (!text) return;
    blocks.push({ type: "paragraph", text });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (format === MARKDOWN) {
      const markdownImageMatch = line.match(MARKDOWN_IMAGE_LINE_REGEX);
      if (markdownImageMatch) {
        const alt = markdownImageMatch[1] ?? "";
        const imageUrl = toSafeHttpUrl(markdownImageMatch[2]);
        if (imageUrl) {
          flushParagraph();
          blocks.push({ type: "image", url: imageUrl, alt: alt.trim() });
          continue;
        }
      }
    }

    const safeLineUrl = toSafeHttpUrl(line);
    if (safeLineUrl) {
      const youtubeEmbedUrl = toYouTubeEmbedUrl(safeLineUrl);
      if (youtubeEmbedUrl) {
        flushParagraph();
        blocks.push({ type: "youtube", embedUrl: youtubeEmbedUrl });
        continue;
      }
      if (isLikelyImageUrl(safeLineUrl)) {
        flushParagraph();
        blocks.push({ type: "image", url: safeLineUrl, alt: "" });
        continue;
      }
    }

    paragraphLines.push(rawLine);
  }

  flushParagraph();
  return blocks;
}

function renderInlineSegments(line: string, keyPrefix: string, linkClassName: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;

  for (const match of line.matchAll(TOKEN_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      nodes.push(line.slice(lastIndex, matchIndex));
    }

    const markdownLabel = match[1];
    const markdownUrl = match[2];
    const rawUrl = match[3];

    if (markdownLabel && markdownUrl) {
      const safeUrl = toSafeHttpUrl(markdownUrl);
      if (safeUrl) {
        nodes.push(
          <a
            key={`${keyPrefix}-md-link-${segmentIndex}`}
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            {markdownLabel}
          </a>,
        );
      } else {
        nodes.push(match[0]);
      }
    } else if (rawUrl) {
      const { urlPart, trailingPart } = splitTrailingPunctuation(rawUrl);
      const safeUrl = toSafeHttpUrl(urlPart);
      if (safeUrl) {
        nodes.push(
          <a
            key={`${keyPrefix}-raw-link-${segmentIndex}`}
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            {urlPart}
          </a>,
        );
        if (trailingPart) {
          nodes.push(trailingPart);
        }
      } else {
        nodes.push(match[0]);
      }
    } else {
      nodes.push(match[0]);
    }

    lastIndex = matchIndex + match[0].length;
    segmentIndex += 1;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  if (!nodes.length) {
    nodes.push(line);
  }

  return nodes;
}

function splitTrailingPunctuation(value: string): { urlPart: string; trailingPart: string } {
  let end = value.length;
  while (end > 0 && ",.!?;:".includes(value[end - 1])) {
    end -= 1;
  }
  return {
    urlPart: value.slice(0, end),
    trailingPart: value.slice(end),
  };
}

function isLikelyImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS_REGEX.test(url);
}

function toSafeHttpUrl(input: string): string | null {
  try {
    const candidate = new URL(input);
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") {
      return null;
    }
    return candidate.toString();
  } catch {
    return null;
  }
}

function toYouTubeEmbedUrl(inputUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const path = parsed.pathname;

  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = path.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (path === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (path.startsWith("/embed/")) {
      videoId = path.split("/")[2] ?? null;
    } else if (path.startsWith("/shorts/")) {
      videoId = path.split("/")[2] ?? null;
    }
  }

  if (!videoId) return null;
  if (!/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}
