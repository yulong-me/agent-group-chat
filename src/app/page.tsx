'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, getAgentInfo } from '@/store';
import { AgentList } from '@/components/AgentList';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { TaskPanel } from '@/components/TaskPanel';
import { SessionList } from '@/components/SessionList';
import { QuickCommands } from '@/components/QuickCommands';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { Message, Task } from '@/types';

type RuntimeStatus = 'idle' | 'checking' | 'thinking' | 'working' | 'completed' | 'error' | 'timeout';

export default function ChatPage() {
  const router = useRouter();
  const {
    agents,
    messages,
    addMessage,
    currentUser,
    setCurrentUser,
    tasks,
    addTask,
    sessions,
    currentSessionId,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickCommand, setQuickCommand] = useState('');

  // Agent 状态
  const [agentStatus, setAgentStatus] = useState<RuntimeStatus>('idle');
  const [agentStatusMessage, setAgentStatusMessage] = useState('');
  const [agentCurrentContent, setAgentCurrentContent] = useState('');
  const [agentCurrentTool, setAgentCurrentTool] = useState<{ name: string; action: string } | null>(null);
  const [outputTokens, setOutputTokens] = useState(0);
  const statusContentRef = useRef<HTMLDivElement>(null);

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

    // 重置状态
    setAgentStatus('checking');
    setAgentStatusMessage('正在检查 Claude CLI...');
    setAgentCurrentContent('');
    setAgentCurrentTool(null);
    setOutputTokens(0);

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

    // Show loading
    setIsLoading(true);

    try {
      // 使用流式 API
      const response = await fetch('/api/chat-stream', {
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

      if (!response.ok) {
        throw new Error('Failed to start chat');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Cannot read response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let currentAgent = 'pm';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // 解析事件
          let eventType = 'message';
          let eventData: any = {};

          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
            // 尝试获取后续的 data 行
            continue;
          } else if (line.startsWith('data: ')) {
            try {
              eventData = JSON.parse(line.slice(6));
            } catch (e) {
              continue;
            }
          } else {
            continue;
          }

          // 处理事件
          switch (eventType) {
            case 'status':
              setAgentStatus(eventData.status);
              setAgentStatusMessage(eventData.message || '');
              break;
            case 'content':
              if (eventData.text) {
                fullContent += eventData.text;
                setAgentCurrentContent(fullContent);
                // 自动滚动
                setTimeout(() => {
                  if (statusContentRef.current) {
                    statusContentRef.current.scrollTop = statusContentRef.current.scrollHeight;
                  }
                }, 10);
              }
              break;
            case 'thinking':
              if (eventData.type === 'start') {
                setAgentStatus('thinking');
                setAgentStatusMessage('Agent 正在思考...');
              } else if (eventData.type === 'stop') {
                setAgentStatus('working');
                setAgentStatusMessage('Agent 工作中...');
              }
              break;
            case 'tool':
              setAgentCurrentTool({ name: eventData.tool, action: eventData.action });
              if (eventData.action === 'complete') {
                setTimeout(() => setAgentCurrentTool(null), 2000);
              }
              break;
            case 'progress':
              if (eventData.outputTokens) {
                setOutputTokens(eventData.outputTokens);
              }
              break;
            case 'error':
              setAgentStatus('error');
              setAgentStatusMessage(eventData.message || '执行出错');
              break;
            case 'done':
              // 任务完成
              if (eventData.task) {
                addTask({
                  title: eventData.task.title,
                  description: eventData.task.description,
                  status: eventData.task.status,
                  assigneeId: eventData.task.assigneeId,
                });
              }

              // 添加 agent 响应消息
              if (eventData.responses && Array.isArray(eventData.responses)) {
                for (const resp of eventData.responses) {
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

              setAgentStatus('completed');
              setAgentStatusMessage('任务完成');
              break;
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setAgentStatus('error');
      setAgentStatusMessage(error.message || '请求失败');

      const errorMessage: Omit<Message, 'id' | 'timestamp'> = {
        userId: 'system',
        userName: '系统',
        userAvatar: '⚠️',
        content: `抱歉，处理你的请求时出现错误：${error.message}`,
        type: 'system',
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    setQuickCommand(command);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
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
            {/* Session selector */}
            <SessionList />

            {/* Quick commands */}
            <QuickCommands onSelect={handleQuickCommand} />

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

        {/* Agent 实时状态 */}
        {isLoading && (
          <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              {/* 状态图标 */}
              <div className="flex gap-1">
                {agentStatus === 'checking' && (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </>
                )}
                {agentStatus === 'thinking' && (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                  </>
                )}
                {agentStatus === 'working' && (
                  <>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </>
                )}
                {agentStatus === 'error' && (
                  <span className="text-red-500">❌</span>
                )}
                {agentStatus === 'completed' && (
                  <span className="text-green-500">✅</span>
                )}
              </div>

              {/* 状态文字 */}
              <span className={`text-sm font-medium ${
                agentStatus === 'checking' ? 'text-yellow-400' :
                agentStatus === 'thinking' ? 'text-blue-400' :
                agentStatus === 'working' ? 'text-purple-400' :
                agentStatus === 'error' ? 'text-red-400' :
                agentStatus === 'completed' ? 'text-green-400' :
                'text-gray-400'
              }`}>
                {agentStatusMessage || '处理中...'}
              </span>

              {/* 工具调用 */}
              {agentCurrentTool && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                  {agentCurrentTool.action === 'start' ? '🔧' : '✅'}
                  {agentCurrentTool.name}
                </span>
              )}

              {/* Token 计数 */}
              {outputTokens > 0 && (
                <span className="text-xs text-gray-500 ml-auto">
                  {outputTokens} tokens
                </span>
              )}
            </div>

            {/* 实时内容 */}
            {agentCurrentContent && (
              <div
                ref={statusContentRef}
                className="bg-gray-950 rounded-lg p-3 max-h-40 overflow-y-auto text-sm text-gray-300 font-mono whitespace-pre-wrap border border-gray-800"
              >
                {agentCurrentContent}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <MessageInput
          agents={agents}
          onSend={handleSendMessage}
          disabled={isLoading}
          defaultValue={quickCommand}
          onClearQuickCommand={() => setQuickCommand('')}
        />
      </div>

      {/* Right sidebar - Task panel */}
      {showTaskPanel && <TaskPanel tasks={tasks} agents={agents} onTaskClick={handleTaskClick} />}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
