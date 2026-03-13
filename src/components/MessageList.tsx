'use client';

import { useEffect, useRef, useState } from 'react';
import { Message, Agent } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAgentInfo } from '@/store';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageListProps {
  messages: Message[];
  agents: Agent[];
  currentUserId?: string;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
}

export function MessageList({ messages, agents, currentUserId, onFeedback }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAgentById = (agentId?: string) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId);
  };

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm', { locale: zhCN });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const agent = getAgentById(message.agentId);

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
            {message.content}
          </span>
        </div>
      );
    }

    // Use streaming content if available, otherwise use full content
    const displayContent = streamingContent[message.id] || message.content;

    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
          {isUser ? '👤' : agent?.avatar || getAgentInfo(message.agentId || '').avatar || '🤖'}
        </div>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">
              {isUser ? message.userName : agent?.name || getAgentInfo(message.agentId || '').name || 'Agent'}
            </span>
            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
          </div>
          <div
            className={`px-4 py-2 rounded-2xl ${
              isUser
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-gray-800 text-gray-100 rounded-tl-sm'
            }`}
          >
            {!isUser ? (
              <MarkdownRenderer content={displayContent} />
            ) : (
              <p className="whitespace-pre-wrap">{displayContent}</p>
            )}
          </div>

          {/* Feedback buttons for agent messages */}
          {!isUser && !isSystem && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onFeedback?.(message.id, 'like')}
                className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                  message.feedback === 'like' ? 'text-green-400' : 'text-gray-500'
                }`}
                title="点赞"
              >
                <svg className="w-4 h-4" fill={message.feedback === 'like' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                onClick={() => onFeedback?.(message.id, 'dislike')}
                className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                  message.feedback === 'dislike' ? 'text-red-400' : 'text-gray-500'
                }`}
                title="点踩"
              >
                <svg className="w-4 h-4" fill={message.feedback === 'dislike' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>

              {/* Token usage */}
              {message.usage && (
                <span className="text-xs text-gray-500">
                  {message.usage.inputTokens + message.usage.outputTokens} tokens
                </span>
              )}
            </div>
          )}

          {/* Mentions */}
          {message.mentions && message.mentions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.mentions.map((mention) => {
                const mentionedAgent = getAgentById(mention);
                return (
                  <span
                    key={mention}
                    className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-blue-300"
                  >
                    @{mentionedAgent?.name || getAgentInfo(mention).name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <p>开始你的第一个对话</p>
          <p className="text-sm mt-1">输入消息或 @提及 Agent 来分配任务</p>
        </div>
      ) : (
        <>
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
