'use client';

import { Task, Agent } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAgentInfo } from '@/store';

interface TaskPanelProps {
  tasks: Task[];
  agents: Agent[];
}

export function TaskPanel({ tasks, agents }: TaskPanelProps) {
  const getAgentById = (agentId?: string) => {
    if (!agentId) return null;
    // 尝试直接匹配
    let agent = agents.find((a) => a.id === agentId);
    if (agent) return agent;
    // 尝试去掉 agent- 前缀
    const normalizedId = agentId.replace('agent-', '');
    agent = agents.find((a) => a.id === normalizedId);
    if (agent) return agent;
    // 使用 getAgentInfo 获取信息
    return getAgentInfo(agentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), 'MM-dd HH:mm', { locale: zhCN });
  };

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">任务面板</h2>
        <p className="text-sm text-gray-400 mt-1">{tasks.length} 个任务</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">暂无任务</p>
            <p className="text-xs mt-1">发送消息自动创建任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const assigneeInfo = getAgentById(task.assigneeId);
              return (
                <div
                  key={task.id}
                  className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-white text-sm flex-1 line-clamp-2">{task.title}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {assigneeInfo && (
                      <span className="flex items-center gap-1">
                        <span>{assigneeInfo.avatar}</span>
                        <span>{assigneeInfo.name}</span>
                      </span>
                    )}
                    <span>{formatTime(task.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
