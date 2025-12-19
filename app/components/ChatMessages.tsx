'use client';

import { User, Copy, Check } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { Logo } from './icons/logo';
import { FileIcon } from './icons/FileIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState, useCallback } from 'react';

export interface Upload {
  id: string;
  url: string;
  folder: string;
  resourceType: string;
  fileName: string;
  publicId: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  uploads?: Upload[];
  author?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-[#2d2d2d] px-4 py-2 text-xs text-[#a0a0a0]">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: '1rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;

          if (isInline) {
            return (
              <code className="bg-[#3a3a3a] px-1.5 py-0.5 rounded text-sm font-mono text-[#e0e0e0]" {...props}>
                {children}
              </code>
            );
          }

          return (
            <CodeBlock language={match ? match[1] : ''}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          );
        },
        h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-[#f3f3f3]">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-[#f3f3f3]">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-[#f3f3f3]">{children}</h3>,
        p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#565656] pl-4 italic my-4 text-[#a0a0a0]">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-[#7ab8f5] hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-bold text-[#f3f3f3]">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="border-[#3a3a3a] my-6" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-[#3a3a3a]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-[#3a3a3a] px-4 py-2 bg-[#2a2a2a] font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-[#3a3a3a] px-4 py-2">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function FileAttachment({ upload }: { upload: Upload }) {
  const isImage = upload.resourceType === 'image';
  const isVideo = upload.resourceType === 'video';

  if (isImage) {
    return (
      <a
        href={upload.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden max-w-sm hover:opacity-90 transition-opacity"
      >
        <img
          src={upload.url}
          alt={upload.fileName}
          className="w-full h-auto"
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video
        controls
        className="rounded-lg max-w-sm w-full"
        src={upload.url}
      >
        Tu navegador no soporta video.
      </video>
    );
  }

  // Documentos y otros archivos
  return (
    <a
      href={`/api/download/${upload.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2a2a2a] hover:bg-[#323232] transition-colors max-w-sm"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded bg-[#3a3a3a] flex items-center justify-center">
        <FileIcon fileName={upload.fileName} className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#f3f3f3] truncate">{upload.fileName}</p>
        <p className="text-xs text-[#afafaf]">Click para descargar</p>
      </div>
    </a>
  );
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { user } = useUser();
  const userAvatarUrl = user?.imageUrl;
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        message.role === 'system' ? (
          <div key={message.id} className="max-w-3xl mx-auto px-4">
            <div className="text-center text-sm text-[#afafaf] whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        ) : (
          <div
            key={message.id}
            className={`flex gap-4 max-w-3xl mx-auto ${message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Logo className='w-6 h-6 text-black' />
              </div>
            )}

            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] ${message.role === 'user'
                  ? 'bg-[#2f2f2f] text-[#f3f3f3]'
                  : 'bg-transparent text-[#f3f3f3]'
                }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-invert max-w-none">
                  <MarkdownContent content={message.content} />
                  {message.uploads && message.uploads.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.uploads.map((upload) => (
                        <FileAttachment key={upload.id} upload={upload} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.uploads && message.uploads.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.uploads.map((upload) => (
                        <FileAttachment key={upload.id} upload={upload} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                {(message.author?.image || userAvatarUrl) ? (
                  <img
                    src={message.author?.image || userAvatarUrl || ''}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#5436DA] flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ))}

      {isLoading && (
        <div className="flex gap-4 max-w-3xl mx-auto justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Logo className='w-6 h-6 text-black' />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-[#afafaf] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#afafaf] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#afafaf] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
