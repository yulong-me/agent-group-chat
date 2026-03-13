// Types for the AI Agent Collaboration Group System

export type AgentRole = 'PM' | 'Developer' | 'Tester' | 'Designer';

export type AgentStatus = 'online' | 'busy' | 'offline';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type MessageType = 'user' | 'agent' | 'system';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  systemPrompt: string;
  status: AgentStatus;
  avatar: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  type: MessageType;
  agentId?: string;
  mentions?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
  result?: string;
}

export interface TaskResult {
  id: string;
  taskId: string;
  result: string;
  timestamp: number;
}
