/**
 * AI Response Component
 * Enhanced markdown rendering with syntax highlighting, math, tables, and more
 * Inspired by AI SDK Elements but adapted for your backend architecture
 */
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

// Import styles for math and code highlighting
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

/**
 * AI Response Component
 * Renders markdown content with enhanced features
 */
export function AIResponse({
  children,
  content,
  status = 'complete', // 'streaming' | 'complete'
  className,
  ...props
}) {
  const displayContent = content || children || '';

  // Custom components for markdown elements
  const components = {
    // Code blocks with syntax highlighting
    code({ node, inline, className: codeClassName, children, ...codeProps }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';

      if (!inline && language) {
        return (
          <div className="relative group my-4">
            {/* Language badge */}
            {language && (
              <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-muted rounded text-muted-foreground font-mono">
                {language}
              </div>
            )}

            {/* Code block */}
            <pre className={cn(
              "p-4 rounded-lg bg-muted overflow-x-auto",
              codeClassName
            )} {...codeProps}>
              <code className={codeClassName}>
                {children}
              </code>
            </pre>

            {/* Copy button */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(String(children));
              }}
              className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background border rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </button>
          </div>
        );
      }

      // Inline code
      return (
        <code className={cn(
          "px-1.5 py-0.5 rounded bg-muted text-sm font-mono",
          codeClassName
        )} {...codeProps}>
          {children}
        </code>
      );
    },

    // Enhanced links
    a({ href, children, ...linkProps }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
          {...linkProps}
        >
          {children}
        </a>
      );
    },

    // Enhanced tables
    table({ children, ...tableProps }) {
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border-collapse border border-border" {...tableProps}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...thProps }) {
      return (
        <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...thProps}>
          {children}
        </th>
      );
    },
    td({ children, ...tdProps }) {
      return (
        <td className="border border-border px-4 py-2" {...tdProps}>
          {children}
        </td>
      );
    },

    // Enhanced lists
    ul({ children, ...ulProps }) {
      return <ul className="list-disc list-inside my-2 space-y-1" {...ulProps}>{children}</ul>;
    },
    ol({ children, ...olProps }) {
      return <ol className="list-decimal list-inside my-2 space-y-1" {...olProps}>{children}</ol>;
    },

    // Enhanced blockquotes
    blockquote({ children, ...blockquoteProps }) {
      return (
        <blockquote
          className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground"
          {...blockquoteProps}
        >
          {children}
        </blockquote>
      );
    },

    // Task lists (checkboxes)
    input({ type, checked, ...inputProps }) {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2"
            {...inputProps}
          />
        );
      }
      return <input type={type} {...inputProps} />;
    }
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {displayContent}
      </ReactMarkdown>

      {/* Streaming indicator */}
      {status === 'streaming' && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
      )}
    </div>
  );
}

export default AIResponse;
