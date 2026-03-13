'use client';

import { Task } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAgentInfo } from '@/store';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const assigneeInfo = task.assigneeId ? getAgentInfo(task.assigneeId) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">任务详情</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Task info */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">{task.title}</h3>
            <p className="text-gray-400 text-sm">{task.description}</p>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-500">
            {assigneeInfo && (
              <div className="flex items-center gap-2">
                <span>{assigneeInfo.avatar}</span>
                <span>{assigneeInfo.name}</span>
              </div>
            )}
            <div>
              创建时间: {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
            <div>
              更新时间: {format(new Date(task.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
          </div>

          {/* Result */}
          {task.result && (
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">任务结果</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <MarkdownRenderer content={task.result} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
