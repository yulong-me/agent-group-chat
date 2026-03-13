'use client';

import { useState, useEffect, useRef } from 'react';

export type AgentStatus = 'idle' | 'checking' | 'thinking' | 'working' | 'completed' | 'error' | 'timeout';

export interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  status: AgentStatus;
  message: string;
  content?: string;
  toolName?: string;
  toolAction?: 'start' | 'complete';
  progress?: number;
  timestamp: number;
}

interface AgentStatusPanelProps {
  taskId?: string;
  onClose?: () => void;
}

export function AgentStatusPanel({ taskId, onClose }: AgentStatusPanelProps) {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [currentStatus, setCurrentStatus] = useState<AgentStatus>('idle');
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentTool, setCurrentTool] = useState<{ name: string; action: string } | null>(null);
  const [outputTokens, setOutputTokens] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新内容
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [currentContent]);

  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'idle':
        return 'text-gray-400';
      case 'checking':
        return 'text-yellow-400';
      case 'thinking':
        return 'text-blue-400';
      case 'working':
        return 'text-purple-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
      case 'timeout':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: AgentStatus): string => {
    switch (status) {
      case 'idle':
        return '⏳';
      case 'checking':
        return '🔍';
      case 'thinking':
        return '🤔';
      case 'working':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'timeout':
        return '⏱️';
      default:
        return '⏳';
    }
  };

  const getStatusLabel = (status: AgentStatus): string => {
    switch (status) {
      case 'idle':
        return '等待中';
      case 'checking':
        return '检查中';
      case 'thinking':
        return '思考中';
      case 'working':
        return '工作中';
      case 'completed':
        return '已完成';
      case 'error':
        return '出错';
      case 'timeout':
        return '超时';
      default:
        return '未知';
    }
  };

  // 监听 SSE 事件
  useEffect(() => {
    if (!taskId) return;

    const eventSource = new EventSource(`/api/chat-stream?taskId=${taskId}`);

    eventSource.onmessage = (event) => {
      console.log('SSE message:', event.data);
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  // 如果没有活动，显示空状态
  if (activities.length === 0 && currentStatus === 'idle') {
    return null;
  }

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon(currentStatus)}</span>
          <span className={`font-medium ${getStatusColor(currentStatus)}`}>
            {getStatusLabel(currentStatus)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {currentTool && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-400">
                {currentTool.action === 'start' ? '🔧 调用工具:' : '✅ 工具完成:'}
              </span>
              <span className="text-gray-300">{currentTool.name}</span>
            </div>
          )}
          {outputTokens > 0 && (
            <span className="text-xs text-gray-500">
              Token: {outputTokens}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-400 text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 当前消息 */}
      {currentMessage && (
        <div className="text-sm text-gray-400 mb-2">
          {currentMessage}
        </div>
      )}

      {/* 实时内容显示 */}
      <div
        ref={contentRef}
        className="bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto text-sm font-mono text-gray-300 whitespace-pre-wrap"
      >
        {currentContent || (
          <span className="text-gray-600 italic">
            {currentStatus === 'thinking' ? 'Agent 正在思考...' :
             currentStatus === 'working' ? 'Agent 正在处理任务...' :
             '等待任务开始...'}
          </span>
        )}
      </div>

      {/* 活动历史 */}
      {activities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2">活动记录</div>
          <div className="space-y-1">
            {activities.slice(-5).map((activity) => (
              <div key={activity.id} className="text-xs flex items-center gap-2">
                <span className="text-gray-600">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                <span>{getStatusIcon(activity.status)}</span>
                <span className={getStatusColor(activity.status)}>{activity.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// SSE 连接 Hook
export function useChatStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AgentStatus>('idle');
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentTool, setCurrentTool] = useState<{ name: string; action: string } | null>(null);
  const [outputTokens, setOutputTokens] = useState(0);
  const [responses, setResponses] = useState<Array<{ agentId: string; content: string }>>([]);
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = async (payload: {
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    mentions: string[];
    messageHistory: any[];
  }) => {
    // 清理之前的连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // 重置状态
    setCurrentStatus('checking');
    setCurrentMessage('');
    setCurrentContent('');
    setCurrentTool(null);
    setOutputTokens(0);
    setResponses([]);
    setTask(null);
    setError(null);

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat stream');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Cannot read response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            // 获取对应的 data
            const dataMatch = buffer.match(/data: (.+)/);
            if (dataMatch) {
              try {
                const data = JSON.parse(dataMatch[1]);
                handleEvent(eventType, data);
              } catch (e) {
                console.error('Failed to parse event data:', e);
              }
            }
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent('message', data);
            } catch (e) {
              console.error('Failed to parse data:', e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setCurrentStatus('error');
    }
  };

  const handleEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'status':
        setCurrentStatus(data.status);
        setCurrentMessage(data.message || '');
        break;
      case 'content':
        setCurrentContent(prev => prev + (data.text || ''));
        break;
      case 'thinking':
        if (data.type === 'start') {
          setCurrentStatus('thinking');
        } else if (data.type === 'stop') {
          setCurrentStatus('working');
        }
        break;
      case 'tool':
        setCurrentTool({ name: data.tool, action: data.action });
        break;
      case 'progress':
        if (data.outputTokens) {
          setOutputTokens(data.outputTokens);
        }
        break;
      case 'error':
        setError(data.message);
        setCurrentStatus('error');
        break;
      case 'done':
        setResponses(data.responses || []);
        setTask(data.task);
        setCurrentStatus('completed');
        break;
      default:
        // 处理消息类型
        if (data.status) {
          setCurrentStatus(data.status);
        }
        if (data.message) {
          setCurrentMessage(data.message);
        }
        if (data.text) {
          setCurrentContent(prev => prev + data.text);
        }
        if (data.tool) {
          setCurrentTool({ name: data.tool, action: data.action });
        }
        if (data.outputTokens) {
          setOutputTokens(data.outputTokens);
        }
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  return {
    isConnected,
    currentStatus,
    currentMessage,
    currentContent,
    currentTool,
    outputTokens,
    responses,
    task,
    error,
    startStream,
    disconnect,
  };
}
