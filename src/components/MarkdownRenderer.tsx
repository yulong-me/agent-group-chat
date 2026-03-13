'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: '0.5rem 0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // Style other elements
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold text-white mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 mb-2">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2">
            <table className="min-w-full border border-gray-700">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-gray-700 px-2 py-1 bg-gray-800 text-left">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-700 px-2 py-1">{children}</td>
        ),
        hr: () => <hr className="border-gray-700 my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
