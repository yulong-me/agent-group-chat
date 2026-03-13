import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Agent, Message, Task, User, AgentRole, AgentStatus } from '@/types';

interface AppState {
  // Current user
  currentUser: User | null;

  // Agents in the group
  agents: Agent[];

  // Messages in the chat
  messages: Message[];

  // Tasks
  tasks: Task[];

  // Actions
  setCurrentUser: (user: User) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  addAgent: (agent: Omit<Agent, 'id'>) => Agent;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setTasks: (tasks: Task[]) => void;
  getTaskById: (taskId: string) => Task | undefined;
  getMessagesByAgent: (agentId: string) => Message[];
  getTasksByAgent: (agentId: string) => Task[];
}

// Agent mapping - 兼容新旧 ID 格式
const agentMap: Record<string, { name: string; role: AgentRole; description: string; avatar: string }> = {
  pm: { name: 'PM Agent', role: 'PM' as AgentRole, description: '项目经理 - 分析需求、拆分任务', avatar: '🎯' },
  developer: { name: 'Developer Agent', role: 'Developer' as AgentRole, description: '开发者 - 代码实现、功能开发', avatar: '💻' },
  tester: { name: 'Tester Agent', role: 'Tester' as AgentRole, description: '测试工程师 - 测试用例、代码审查', avatar: '🧪' },
  designer: { name: 'Designer Agent', role: 'Designer' as AgentRole, description: '设计师 - UI/UX 设计建议', avatar: '🎨' },
  // 兼容旧格式
  'agent-pm': { name: 'PM Agent', role: 'PM' as AgentRole, description: '项目经理', avatar: '🎯' },
  'agent-dev': { name: 'Developer Agent', role: 'Developer' as AgentRole, description: '开发者', avatar: '💻' },
  'agent-tester': { name: 'Tester Agent', role: 'Tester' as AgentRole, description: '测试工程师', avatar: '🧪' },
  'agent-designer': { name: 'Designer Agent', role: 'Designer' as AgentRole, description: '设计师', avatar: '🎨' },
};

// Default agents with new IDs
const defaultAgents: Agent[] = [
  { id: 'pm', name: 'PM Agent', role: 'PM', description: '项目经理 - 分析需求、拆分任务', systemPrompt: '', status: 'online', avatar: '🎯' },
  { id: 'developer', name: 'Developer Agent', role: 'Developer', description: '开发者 - 代码实现', systemPrompt: '', status: 'online', avatar: '💻' },
  { id: 'tester', name: 'Tester Agent', role: 'Tester', description: '测试工程师 - 测试审查', systemPrompt: '', status: 'online', avatar: '🧪' },
  { id: 'designer', name: 'Designer Agent', role: 'Designer', description: '设计师 - UI/UX设计', systemPrompt: '', status: 'online', avatar: '🎨' },
];

// Helper to get agent info by ID
export function getAgentInfo(agentId: string) {
  // 去除 'agent-' 前缀
  const normalizedId = agentId.replace('agent-', '');
  return agentMap[normalizedId] || agentMap[agentId] || { name: agentId, role: 'PM' as AgentRole, description: '', avatar: '🤖' };
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  agents: defaultAgents,
  messages: [],
  tasks: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: uuidv4(),
          timestamp: Date.now(),
        },
      ],
    })),

  addAgent: (agent) => {
    const newAgent: Agent = {
      ...agent,
      id: `agent-${uuidv4()}`,
    };
    set((state) => ({
      agents: [...state.agents, newAgent],
    }));
    return newAgent;
  },

  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, status } : agent
      ),
    })),

  addTask: (task) => {
    const newTask: Task = {
      ...task,
      id: `task-${uuidv4()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
    }));
    return newTask;
  },

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates, updatedAt: Date.now() } : task
      ),
    })),

  setTasks: (tasks) => set({ tasks }),

  getTaskById: (taskId) => get().tasks.find((task) => task.id === taskId),

  getMessagesByAgent: (agentId) =>
    get().messages.filter((msg) => msg.agentId === agentId),

  getTasksByAgent: (agentId) =>
    get().tasks.filter((task) => task.assigneeId === agentId),
}));
