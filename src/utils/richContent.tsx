import { Fragment, type ReactNode } from "react";
import type { RichTextFormat } from "../types";

const MARKDOWN = "MARKDOWN";
const PLAIN = "PLAIN";
const MARKDOWN_IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i;
const TOKEN_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i;

type ParsedBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "horizontalRule" }
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
    .replace(/^(#{1,6})\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/(^|[^_])_([^_]+)_/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
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
        if (block.type === "horizontalRule") {
          return <hr key={`hr-${index}`} className="border-gray-200 dark:border-gray-700" />;
        }

        if (block.type === "heading") {
          const headingClassByLevel: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
            1: "text-3xl font-bold",
            2: "text-2xl font-bold",
            3: "text-xl font-semibold",
            4: "text-lg font-semibold",
            5: "text-base font-semibold",
            6: "text-sm font-semibold uppercase tracking-wide",
          };
          return (
            <div
              key={`heading-${index}`}
              className={`text-gray-900 dark:text-white ${headingClassByLevel[block.level]}`}
            >
              {renderInlineSegments(block.text, `heading-${index}`, effectiveLinkClass)}
            </div>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          const listClassName = block.ordered
            ? "list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-200"
            : "list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-200";
          return (
            <ListTag key={`list-${index}`} className={listClassName}>
              {block.items.map((item, itemIndex) => (
                <li key={`list-item-${index}-${itemIndex}`}>
                  {renderInlineSegments(item, `list-${index}-${itemIndex}`, effectiveLinkClass)}
                </li>
              ))}
            </ListTag>
          );
        }

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

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (format === MARKDOWN) {
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
        flushParagraph();
        blocks.push({ type: "horizontalRule" });
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
        continue;
      }

      const unorderedListMatch = line.match(/^[-*+]\s+(.+)$/);
      if (unorderedListMatch) {
        flushParagraph();
        const items: string[] = [];
        let listIndex = i;
        while (listIndex < lines.length) {
          const listLine = lines[listIndex].trim();
          const listItemMatch = listLine.match(/^[-*+]\s+(.+)$/);
          if (!listItemMatch) break;
          items.push(listItemMatch[1].trim());
          listIndex += 1;
        }
        if (items.length) {
          blocks.push({ type: "list", ordered: false, items });
          i = listIndex - 1;
          continue;
        }
      }

      const orderedListMatch = line.match(/^\d+\.\s+(.+)$/);
      if (orderedListMatch) {
        flushParagraph();
        const items: string[] = [];
        let listIndex = i;
        while (listIndex < lines.length) {
          const listLine = lines[listIndex].trim();
          const listItemMatch = listLine.match(/^\d+\.\s+(.+)$/);
          if (!listItemMatch) break;
          items.push(listItemMatch[1].trim());
          listIndex += 1;
        }
        if (items.length) {
          blocks.push({ type: "list", ordered: true, items });
          i = listIndex - 1;
          continue;
        }
      }

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
      nodes.push(...renderTextDecorators(line.slice(lastIndex, matchIndex), `${keyPrefix}-txt-${segmentIndex}`));
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
            {renderTextDecorators(markdownLabel, `${keyPrefix}-md-label-${segmentIndex}`)}
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
          nodes.push(...renderTextDecorators(trailingPart, `${keyPrefix}-trail-${segmentIndex}`));
        }
      } else {
        nodes.push(...renderTextDecorators(match[0], `${keyPrefix}-raw-${segmentIndex}`));
      }
    } else {
      nodes.push(...renderTextDecorators(match[0], `${keyPrefix}-fallback-${segmentIndex}`));
    }

    lastIndex = matchIndex + match[0].length;
    segmentIndex += 1;
  }

  if (lastIndex < line.length) {
    nodes.push(...renderTextDecorators(line.slice(lastIndex), `${keyPrefix}-tail`));
  }

  if (!nodes.length) {
    nodes.push(...renderTextDecorators(line, `${keyPrefix}-full`));
  }

  return nodes;
}

function renderTextDecorators(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const decoratorRegex = /(`[^`]+`)|(\*\*|__)(.+?)\2|(\*|_)(.+?)\4/g;
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(decoratorRegex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push(text.slice(lastIndex, matchIndex));
    }

    if (match[1]) {
      tokens.push(
        <code
          key={`${keyPrefix}-code-${tokenIndex}`}
          className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-[0.9em]"
        >
          {match[1].slice(1, -1)}
        </code>,
      );
    } else if (match[3]) {
      tokens.push(<strong key={`${keyPrefix}-strong-${tokenIndex}`}>{match[3]}</strong>);
    } else if (match[5]) {
      tokens.push(<em key={`${keyPrefix}-em-${tokenIndex}`}>{match[5]}</em>);
    } else {
      tokens.push(match[0]);
    }

    lastIndex = matchIndex + match[0].length;
    tokenIndex += 1;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  if (!tokens.length) {
    tokens.push(text);
  }

  return tokens;
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
