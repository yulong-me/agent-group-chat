import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Agent, Message, Task, User, AgentRole, AgentStatus } from '@/types';

export interface Session {
  id: string;
  name: string;
  messages: Message[];
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  // Current user
  currentUser: User | null;

  // Agents in the group
  agents: Agent[];

  // Current session
  sessions: Session[];
  currentSessionId: string | null;

  // Current messages and tasks (alias for current session)
  messages: Message[];
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

  // Session management
  createSession: (name?: string) => Session;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
  getCurrentSession: () => Session | null;
}

// Agent mapping
const agentMap: Record<string, { name: string; role: AgentRole; description: string; avatar: string }> = {
  pm: { name: 'PM Agent', role: 'PM' as AgentRole, description: '项目经理 - 分析需求、拆分任务', avatar: '🎯' },
  developer: { name: 'Developer Agent', role: 'Developer' as AgentRole, description: '开发者 - 代码实现', avatar: '💻' },
  tester: { name: 'Tester Agent', role: 'Tester' as AgentRole, description: '测试工程师 - 测试审查', avatar: '🧪' },
  designer: { name: 'Designer Agent', role: 'Designer' as AgentRole, description: '设计师 - UI/UX设计', avatar: '🎨' },
  'agent-pm': { name: 'PM Agent', role: 'PM' as AgentRole, description: '项目经理', avatar: '🎯' },
  'agent-dev': { name: 'Developer Agent', role: 'Developer' as AgentRole, description: '开发者', avatar: '💻' },
  'agent-tester': { name: 'Tester Agent', role: 'Tester' as AgentRole, description: '测试工程师', avatar: '🧪' },
  'agent-designer': { name: 'Designer Agent', role: 'Designer' as AgentRole, description: '设计师', avatar: '🎨' },
};

const defaultAgents: Agent[] = [
  { id: 'pm', name: 'PM Agent', role: 'PM', description: '项目经理 - 分析需求、拆分任务', systemPrompt: '', status: 'online', avatar: '🎯' },
  { id: 'developer', name: 'Developer Agent', role: 'Developer', description: '开发者 - 代码实现', systemPrompt: '', status: 'online', avatar: '💻' },
  { id: 'tester', name: 'Tester Agent', role: 'Tester', description: '测试工程师 - 测试审查', systemPrompt: '', status: 'online', avatar: '🧪' },
  { id: 'designer', name: 'Designer Agent', role: 'Designer', description: '设计师 - UI/UX设计', systemPrompt: '', status: 'online', avatar: '🎨' },
];

export function getAgentInfo(agentId: string) {
  const normalizedId = agentId.replace('agent-', '');
  return agentMap[normalizedId] || agentMap[agentId] || { name: agentId, role: 'PM' as AgentRole, description: '', avatar: '🤖' };
}

// Create default session
function createDefaultSession(): Session {
  return {
    id: `session-${uuidv4()}`,
    name: '新会话',
    messages: [],
    tasks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const useStore = create<AppState>((set, get) => {
  // Initialize with default session
  const defaultSession = createDefaultSession();

  return {
    currentUser: null,
    agents: defaultAgents,
    sessions: [defaultSession],
    currentSessionId: defaultSession.id,
    messages: defaultSession.messages,
    tasks: defaultSession.tasks,

    setCurrentUser: (user) => set({ currentUser: user }),

    addMessage: (message) => set((state) => {
      const newMessage = {
        ...message,
        id: uuidv4(),
        timestamp: Date.now(),
      };

      // Add to current session
      const sessions = state.sessions.map(s => {
        if (s.id === state.currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, newMessage],
            updatedAt: Date.now(),
          };
        }
        return s;
      });

      return {
        sessions,
        messages: sessions.find(s => s.id === state.currentSessionId)?.messages || [],
      };
    }),

    addAgent: (agent) => {
      const newAgent: Agent = { ...agent, id: `agent-${uuidv4()}` };
      set((state) => ({ agents: [...state.agents, newAgent] }));
      return newAgent;
    },

    updateAgentStatus: (agentId, status) => set((state) => ({
      agents: state.agents.map(agent => agent.id === agentId ? { ...agent, status } : agent),
    })),

    addTask: (task) => {
      const newTask: Task = {
        ...task,
        id: `task-${uuidv4()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => {
        const sessions = state.sessions.map(s => {
          if (s.id === state.currentSessionId) {
            return {
              ...s,
              tasks: [newTask, ...s.tasks],
              updatedAt: Date.now(),
            };
          }
          return s;
        });

        return {
          sessions,
          tasks: sessions.find(s => s.id === state.currentSessionId)?.tasks || [],
        };
      });

      return newTask;
    },

    updateTask: (taskId, updates) => set((state) => {
      const sessions = state.sessions.map(s => {
        if (s.id === state.currentSessionId) {
          return {
            ...s,
            tasks: s.tasks.map(task => task.id === taskId ? { ...task, ...updates, updatedAt: Date.now() } : task),
            updatedAt: Date.now(),
          };
        }
        return s;
      });

      return {
        sessions,
        tasks: sessions.find(s => s.id === state.currentSessionId)?.tasks || [],
      };
    }),

    setTasks: (tasks) => set((state) => {
      const sessions = state.sessions.map(s => {
        if (s.id === state.currentSessionId) {
          return { ...s, tasks, updatedAt: Date.now() };
        }
        return s;
      });
      return { sessions, tasks };
    }),

    getTaskById: (taskId) => get().tasks.find(task => task.id === taskId),

    getMessagesByAgent: (agentId) => get().messages.filter(msg => msg.agentId === agentId),

    getTasksByAgent: (agentId) => get().tasks.filter(task => task.assigneeId === agentId),

    // Session management
    createSession: (name) => {
      const newSession: Session = {
        id: `session-${uuidv4()}`,
        name: name || `会话 ${get().sessions.length + 1}`,
        messages: [],
        tasks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => ({
        sessions: [...state.sessions, newSession],
        currentSessionId: newSession.id,
        messages: newSession.messages,
        tasks: newSession.tasks,
      }));

      return newSession;
    },

    switchSession: (sessionId) => set((state) => {
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        return {
          currentSessionId: sessionId,
          messages: session.messages,
          tasks: session.tasks,
        };
      }
      return state;
    }),

    deleteSession: (sessionId) => set((state) => {
      if (state.sessions.length <= 1) {
        return state; // Keep at least one session
      }

      const sessions = state.sessions.filter(s => s.id !== sessionId);
      const currentSessionId = state.currentSessionId === sessionId
        ? sessions[0]?.id
        : state.currentSessionId;

      return {
        sessions,
        currentSessionId,
        messages: sessions.find(s => s.id === currentSessionId)?.messages || [],
        tasks: sessions.find(s => s.id === currentSessionId)?.tasks || [],
      };
    }),

    renameSession: (sessionId, name) => set((state) => ({
      sessions: state.sessions.map(s => s.id === sessionId ? { ...s, name, updatedAt: Date.now() } : s),
    })),

    getCurrentSession: () => {
      const state = get();
      return state.sessions.find(s => s.id === state.currentSessionId) || null;
    },
  };
});
