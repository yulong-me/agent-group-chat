'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Agent } from '@/types';

interface MessageInputProps {
  agents: Agent[];
  onSend: (content: string, mentions: string[]) => void;
  disabled?: boolean;
}

export function MessageInput({ agents, onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    agent.role.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      // Only show mentions if there's no space after @ or the filter is empty
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (agent: Agent) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    const newContent =
      content.slice(0, lastAtPos) + `@${agent.name} ` + content.slice(cursorPos);

    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!content.trim() || disabled) return;

    // Parse mentions from content
    const mentions: string[] = [];
    const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mention = match[1];
      const agent = agents.find(
        (a) => a.name === mention || a.role.toLowerCase() === mention.toLowerCase()
      );
      if (agent) {
        mentions.push(agent.id);
      }
    }

    onSend(content.trim(), mentions);
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  return (
    <div className="border-t border-gray-800 p-4 relative">
      {/* Mention dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => insertMention(agent)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-700 text-left transition-colors"
            >
              <span className="text-xl">{agent.avatar}</span>
              <div>
                <div className="font-medium text-white text-sm">{agent.name}</div>
                <div className="text-xs text-gray-400">{agent.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... 使用 @ 提及 Agent"
            disabled={disabled}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          发送
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        提示：使用 <code className="bg-gray-800 px-1 rounded">@角色名</code>{' '}
        来分配任务给特定 Agent
      </div>
    </div>
  );
}
