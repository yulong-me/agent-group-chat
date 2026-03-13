'use client';

import { Agent, AgentStatus } from '@/types';

interface AgentListProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export function AgentList({ agents, onAgentClick }: AgentListProps) {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PM':
        return '项目经理';
      case 'Developer':
        return '开发者';
      case 'Tester':
        return '测试工程师';
      case 'Designer':
        return '设计师';
      default:
        return role;
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Agent 团队</h2>
        <p className="text-sm text-gray-400 mt-1">{agents.length} 位成员在线</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onAgentClick?.(agent)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                {agent.avatar}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(agent.status)}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">{agent.name}</span>
              </div>
              <span className="text-xs text-gray-400">{getRoleLabel(agent.role)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
