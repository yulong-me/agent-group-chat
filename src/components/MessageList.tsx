'use client';

import { useEffect, useRef } from 'react';
import { Message, Agent } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MessageListProps {
  messages: Message[];
  agents: Agent[];
  currentUserId?: string;
}

export function MessageList({ messages, agents, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
          {isUser ? '👤' : agent?.avatar || '🤖'}
        </div>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">
              {isUser ? message.userName : agent?.name || 'Agent'}
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
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.mentions && message.mentions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.mentions.map((mention) => {
                  const mentionedAgent = getAgentById(mention);
                  return (
                    <span
                      key={mention}
                      className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-blue-300"
                    >
                      @{mentionedAgent?.name || mention}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
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
