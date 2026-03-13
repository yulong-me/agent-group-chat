import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (in production, use a database)
let messages: any[] = [];

export async function GET() {
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userAvatar, content, type, agentId, mentions } = body;

    const message = {
      id: uuidv4(),
      userId,
      userName,
      userAvatar,
      content,
      type: type || 'user',
      agentId,
      mentions: mentions || [],
      timestamp: Date.now(),
    };

    messages.push(message);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  messages = [];
  return NextResponse.json({ success: true });
}
