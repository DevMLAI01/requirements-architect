'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { GenerationStats } from './GenerationStats';

interface Props {
  content: string;
  isDone: boolean;
  tokensEstimate: number;
  generationMs: number;
  onReset: () => void;
  onRefine?: () => void;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold text-zinc-900 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 text-xl font-semibold text-zinc-900">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-semibold text-zinc-800">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-7 text-zinc-700">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-6 text-zinc-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-6 text-zinc-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-zinc-200 px-4 py-2 text-left font-semibold text-zinc-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-200 px-4 py-2 text-zinc-700">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm">{children}</pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code className={`${className ?? ''} text-zinc-100`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800"
        {...props}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-zinc-300 pl-4 italic text-zinc-600">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-zinc-200" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
};

export function MarkdownRenderer({
  content,
  isDone,
  tokensEstimate,
  generationMs,
  onReset,
  onRefine,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Scroll to bottom on each chunk while streaming
  useEffect(() => {
    if (!isDone) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, isDone]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REQUIREMENTS.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-zinc-500">REQUIREMENTS.md</span>
          {!isDone && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Streaming…
            </span>
          )}
        </div>
        {isDone && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              {copied ? '✓ Copied!' : 'Copy .md'}
            </button>
            <button
              onClick={handleDownload}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              Download .md
            </button>
            {onRefine && (
              <button
                onClick={onRefine}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900"
              >
                Refine ✎
              </button>
            )}
            <button
              onClick={onReset}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
            >
              New →
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="rounded-lg border border-zinc-200 bg-white px-8 py-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
          {content}
        </ReactMarkdown>
        {!isDone && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-zinc-400" aria-hidden />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Stats — shown only after done */}
      {isDone && tokensEstimate > 0 && (
        <GenerationStats tokensEstimate={tokensEstimate} generationMs={generationMs} />
      )}
    </div>
  );
}
