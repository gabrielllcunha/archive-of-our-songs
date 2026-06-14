import { Fragment, ReactNode } from "react";
import { Blockquote } from "@radix-ui/themes";

const INLINE_MARKDOWN_PATTERN =
  /(\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_)/g;

const BLOCKQUOTE_LINE_PATTERN = /^>\s?(.*)$/;

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string };

function renderFormattedSegment(token: string, key: string): ReactNode {
  if (token.startsWith("**")) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }
  if (token.startsWith("*")) {
    return <strong key={key}>{token.slice(1, -1)}</strong>;
  }
  if (token.startsWith("__")) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }
  if (token.startsWith("_")) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }
  return token;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_MARKDOWN_PATTERN.lastIndex = 0;
  while ((match = INLINE_MARKDOWN_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(renderFormattedSegment(match[0], `${match.index}-${match[0]}`));
    lastIndex = INLINE_MARKDOWN_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const blockquoteMatch = line.match(BLOCKQUOTE_LINE_PATTERN);

    if (blockquoteMatch) {
      const quoteLines: string[] = [blockquoteMatch[1]];
      index += 1;
      while (index < lines.length) {
        const nextMatch = lines[index].match(BLOCKQUOTE_LINE_PATTERN);
        if (!nextMatch) break;
        quoteLines.push(nextMatch[1]);
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (index < lines.length) {
      if (BLOCKQUOTE_LINE_PATTERN.test(lines[index])) break;
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

interface InlineMarkdownProps {
  text: string;
  paragraphClassName?: string;
  blockquoteClassName?: string;
}

export function InlineMarkdown({
  text,
  paragraphClassName,
  blockquoteClassName,
}: InlineMarkdownProps) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <Fragment>
      {blocks.map((block, blockIndex) => {
        if (block.type === "blockquote") {
          return (
            <Blockquote
              key={`blockquote-${blockIndex}`}
              className={blockquoteClassName}
              size="1"
            >
              {renderInlineMarkdown(block.text)}
            </Blockquote>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className={paragraphClassName}>
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </Fragment>
  );
}
