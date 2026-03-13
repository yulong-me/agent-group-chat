import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { testClaudeCLIConnection, checkClaudeCLI } from '@/lib/claude-cli';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callMethod, apiKey, model, apiBaseUrl, claudeCommand, cliModel } = body;

    if (!callMethod) {
      return NextResponse.json(
        { success: false, error: '请选择调用方式' },
        { status: 400 }
      );
    }

    // 测试 Claude CLI 方式
    if (callMethod === 'cli') {
      const result = await testClaudeCLIConnection({
        command: claudeCommand || 'claude',
        model: cliModel || 'claude-sonnet-4-6',
      });

      return NextResponse.json({
        success: result.success,
        message: result.message,
        callMethod: 'cli',
        details: result.details,
      });
    }

    // 测试 API 方式
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key is required' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
      baseURL: apiBaseUrl || 'https://api.anthropic.com',
    });

    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "Connection successful" if you receive this message.',
        },
      ],
    });

    const content = response.content[0];
    const message = content.type === 'text' ? content.text : 'Unknown response';

    return NextResponse.json({
      success: true,
      message: `连接成功！${message}`,
      callMethod: 'api',
      model: response.model,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('Test connection error:', error);

    if (error.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Key. Please check your credentials.' },
        { status: 401 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Access forbidden. API key may not have the required permissions.' },
        { status: 403 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.cause?.code === 'ENOTFOUND' || error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { success: false, error: `无法连接到 API 服务器 ${error.cause?.hostname || 'unknown'}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to connect' },
      { status: 500 }
    );
  }
}

// GET: 检查 Claude CLI 状态
export async function GET() {
  const cliStatus = await checkClaudeCLI();

  return NextResponse.json({
    cli: {
      available: cliStatus.available,
      version: cliStatus.version,
      error: cliStatus.error,
    },
  });
}
