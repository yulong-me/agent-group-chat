import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus } from '@/types';

// In-memory storage
let tasks: any[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assigneeId = searchParams.get('assigneeId');
  const status = searchParams.get('status');

  let filteredTasks = tasks;

  if (assigneeId) {
    filteredTasks = filteredTasks.filter((t) => t.assigneeId === assigneeId);
  }

  if (status) {
    filteredTasks = filteredTasks.filter((t) => t.status === status);
  }

  return NextResponse.json(filteredTasks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, status, assigneeId, parentId, result } = body;

    const task = {
      id: `task-${uuidv4()}`,
      title,
      description: description || '',
      status: (status as TaskStatus) || 'pending',
      assigneeId,
      parentId,
      result,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tasks.push(task);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    return NextResponse.json(tasks[taskIndex]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
