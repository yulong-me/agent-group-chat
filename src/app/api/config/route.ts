import { NextRequest, NextResponse } from 'next/server';

// 调用方式: 'api' | 'cli'
let config = {
  // 调用方式
  callMethod: 'api', // 'api' or 'cli'

  // API 方式配置
  anthropicApiKey: '',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  apiBaseUrl: 'https://api.anthropic.com',

  // CLI 方式配置
  claudeCommand: 'claude',
  cliModel: 'claude-sonnet-4-6',
};

export async function GET() {
  return NextResponse.json({
    callMethod: config.callMethod,
    // API 方式
    anthropicApiKey: config.anthropicApiKey ? '***' + config.anthropicApiKey.slice(-4) : '',
    model: config.model,
    maxTokens: config.maxTokens,
    apiBaseUrl: config.apiBaseUrl,
    // CLI 方式
    claudeCommand: config.claudeCommand,
    cliModel: config.cliModel,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      callMethod,
      anthropicApiKey,
      model,
      maxTokens,
      apiBaseUrl,
      claudeCommand,
      cliModel,
    } = body;

    if (callMethod) config.callMethod = callMethod;
    if (anthropicApiKey) config.anthropicApiKey = anthropicApiKey;
    if (model) config.model = model;
    if (maxTokens) config.maxTokens = maxTokens;
    if (apiBaseUrl) config.apiBaseUrl = apiBaseUrl;
    if (claudeCommand) config.claudeCommand = claudeCommand;
    if (cliModel) config.cliModel = cliModel;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  config = {
    callMethod: 'api',
    anthropicApiKey: '',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
    apiBaseUrl: 'https://api.anthropic.com',
    claudeCommand: 'claude',
    cliModel: 'claude-sonnet-4-6',
  };
  return NextResponse.json({ success: true });
}

// Export config getter for use in other routes
export function getConfig() {
  return config;
}
