import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AgentRole, AgentStatus } from '@/types';

// In-memory storage
const agents: any[] = [
  {
    id: 'agent-pm',
    name: 'PM Agent',
    role: 'PM' as AgentRole,
    description: '需求分析师，负责任务拆分和进度跟踪',
    systemPrompt: '你是一个专业的项目经理，擅长分析用户需求，将复杂需求拆分为可执行的任务子项。',
    status: 'online' as AgentStatus,
    avatar: '🎯',
  },
  {
    id: 'agent-dev',
    name: 'Developer Agent',
    role: 'Developer' as AgentRole,
    description: '专业开发者，负责功能代码实现',
    systemPrompt: '你是一个专业的前端开发者，擅长实现各种功能代码。',
    status: 'online' as AgentStatus,
    avatar: '💻',
  },
  {
    id: 'agent-tester',
    name: 'Tester Agent',
    role: 'Tester' as AgentRole,
    description: 'QA专家，负责测试和代码审查',
    systemPrompt: '你是一个专业的QA工程师，擅长编写测试用例和代码审查。',
    status: 'online' as AgentStatus,
    avatar: '🧪',
  },
  {
    id: 'agent-designer',
    name: 'Designer Agent',
    role: 'Designer' as AgentRole,
    description: '设计专家，提供界面和交互建议',
    systemPrompt: '你是一个专业的UI/UX设计师，擅长提供界面和交互设计方案。',
    status: 'online' as AgentStatus,
    avatar: '🎨',
  },
];

export async function GET() {
  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, description, systemPrompt, avatar } = body;

    const agent = {
      id: `agent-${uuidv4()}`,
      name,
      role: role || 'Developer',
      description: description || '',
      systemPrompt: systemPrompt || '',
      status: 'online' as AgentStatus,
      avatar: avatar || '🤖',
    };

    agents.push(agent);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
