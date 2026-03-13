'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, getAgentInfo } from '@/store';
import { AgentList } from '@/components/AgentList';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { TaskPanel } from '@/components/TaskPanel';
import { Message, Task } from '@/types';

export default function ChatPage() {
  const router = useRouter();
  const { agents, messages, addMessage, currentUser, setCurrentUser, tasks, addTask, setTasks } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(true);

  // Initialize current user on mount
  useEffect(() => {
    if (!currentUser) {
      setCurrentUser({
        id: 'user-1',
        name: '用户',
        avatar: '👤',
        role: 'user',
      });
    }
  }, [currentUser, setCurrentUser]);

  const handleSendMessage = async (content: string, mentions: string[]) => {
    if (!currentUser) return;

    // Add user message
    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      type: 'user',
      mentions,
    };
    addMessage(userMessage);

    // Show typing indicator
    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          content,
          mentions,
          messageHistory: messages.slice(-20),
        }),
      });

      const data = await response.json();

      // Add task if returned
      if (data.task) {
        addTask({
          title: data.task.title,
          description: data.task.description,
          status: data.task.status,
          assigneeId: data.task.assigneeId,
        });
      }

      // Add agent responses
      if (data.responses && Array.isArray(data.responses)) {
        for (const resp of data.responses) {
          const agentInfo = getAgentInfo(resp.agentId);
          const agentMessage: Omit<Message, 'id' | 'timestamp'> = {
            userId: resp.agentId,
            userName: agentInfo.name,
            userAvatar: agentInfo.avatar,
            content: resp.content,
            type: 'agent',
            agentId: resp.agentId,
            mentions,
          };
          addMessage(agentMessage);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);

      // Add error message
      const errorMessage: Omit<Message, 'id' | 'timestamp'> = {
        userId: 'system',
        userName: '系统',
        userAvatar: '⚠️',
        content: '抱歉，处理你的请求时出现错误。请检查 API 配置后重试。',
        type: 'system',
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-950">
      {/* Left sidebar - Agent list */}
      <AgentList agents={agents} />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="font-semibold text-white">AI Agent 协作群组</h1>
              <p className="text-xs text-gray-400">多 Agent 协作完成任务</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/settings')}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              ⚙️ 设置
            </button>
            <button
              onClick={() => setShowTaskPanel(!showTaskPanel)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showTaskPanel
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {showTaskPanel ? '隐藏任务' : '显示任务'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          agents={agents}
          currentUserId={currentUser?.id}
        />

        {/* Typing indicator */}
        {isLoading && (
          <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Agent 协作中...</span>
          </div>
        )}

        {/* Input */}
        <MessageInput agents={agents} onSend={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Right sidebar - Task panel */}
      {showTaskPanel && <TaskPanel tasks={tasks} agents={agents} />}
    </div>
  );
}
