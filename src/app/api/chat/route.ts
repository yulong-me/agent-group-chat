import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { callClaudeCLI, checkClaudeCLI, ClaudeAgent } from '@/lib/claude-cli';

// 定义 Agent 团队
const AGENTS: Record<string, ClaudeAgent> = {
  pm: {
    description: '项目经理 - 分析需求、拆分任务、协调进度',
    prompt: `你是一个专业的项目经理（PM Agent）。

你的职责：
1. 分析用户需求，理解任务目标
2. 将复杂任务拆分为可执行的子任务
3. 跟踪任务进度，协调各角色工作
4. 用中文回复，保持专业但友好的语气

当收到任务时：
- 先理解用户需求
- 分析实现方案
- 拆分子任务
- 分配给合适的 Agent（developer, tester, designer）
- 用 Markdown 格式清晰展示任务分解结果`,
  },
  developer: {
    description: '开发者 - 代码实现、功能开发',
    prompt: `你是一个专业的前端开发者（Developer Agent）。

你的职责：
1. 实现功能代码
2. 解决技术难题
3. 提供代码方案和实现

当被分配任务时：
- 分析需求和技术要求
- 提供代码实现
- 解释技术细节
- 用 Markdown 代码块展示代码

协作方式：
- 接受 PM Agent 的任务分配
- 与 Tester Agent 协作确保代码质量
- 用中文回复`,
  },
  tester: {
    description: '测试工程师 - 测试用例、代码审查',
    prompt: `你是一个专业的QA工程师（Tester Agent）。

你的职责：
1. 编写测试用例
2. 代码审查
3. 发现并报告问题
4. 提供改进建议

当被分配任务时：
- 编写测试计划
- 指出代码中的潜在问题
- 提供测试用例
- 用 Markdown 格式展示

协作方式：
- 审查 Developer Agent 的代码
- 与 Developer Agent 协作修复问题
- 用中文回复`,
  },
  designer: {
    description: '设计师 - UI/UX 设计建议',
    prompt: `你是一个专业的UI/UX设计师（Designer Agent）。

你的职责：
1. 提供界面设计方案
2. 优化用户体验
3. 提供视觉和交互建议

当被分配任务时：
- 提供设计建议或方案
- 描述界面布局和交互
- 考虑用户使用场景
- 用 Markdown 格式配合文字描述

协作方式：
- 为 Developer Agent 提供设计参考
- 用中文回复`,
  },
};

// 配置缓存
let cachedConfig: any = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('http://localhost:3000/api/config', { cache: 'no-store' });
    if (res.ok) {
      cachedConfig = await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch config:', e);
  }

  return cachedConfig || {
    callMethod: 'cli',
    anthropicApiKey: '',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
    apiBaseUrl: 'https://api.anthropic.com',
    claudeCommand: 'claude',
    cliModel: 'claude-sonnet-4-6',
  };
}

// 解析 @提及
function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const mentions: string[] = [];
  let match;

  const roleMap: Record<string, string> = {
    'PM': 'pm',
    '产品经理': 'pm',
    '开发': 'developer',
    'Developer': 'developer',
    '程序': 'developer',
    '测试': 'tester',
    'Tester': 'tester',
    'QA': 'tester',
    '设计': 'designer',
    'Designer': 'designer',
  };

  while ((match = mentionRegex.exec(content)) !== null) {
    const mention = match[1];
    for (const [key, agentId] of Object.entries(roleMap)) {
      if (mention.includes(key)) {
        mentions.push(agentId);
        break;
      }
    }
  }

  return [...new Set(mentions)];
}

// 确定应该参与的 Agent
function getTargetAgents(mentions: string[], content: string): string[] {
  // 如果明确 @了特定 Agent，只让那些 Agent 响应
  if (mentions.length > 0) {
    return mentions;
  }

  // 默认：PM 分析任务，可能需要其他 Agent 协助
  const agents = ['pm'];

  const lowerContent = content.toLowerCase();

  // 根据关键词判断需要哪些 Agent
  if (lowerContent.includes('代码') || lowerContent.includes('开发') || lowerContent.includes('实现') || lowerContent.includes('功能')) {
    agents.push('developer');
  }
  if (lowerContent.includes('测试') || lowerContent.includes('bug') || lowerContent.includes('错误') || lowerContent.includes('检查')) {
    agents.push('tester');
  }
  if (lowerContent.includes('设计') || lowerContent.includes('界面') || lowerContent.includes('UI') || lowerContent.includes('UX') || lowerContent.includes('样式')) {
    agents.push('designer');
  }

  return [...new Set(agents)];
}

// 构建任务协作的系统提示
function buildCollaborationPrompt(agents: string[], userMessage: string): string {
  const activeAgents = agents.map(id => AGENTS[id]).filter(Boolean);
  const agentList = activeAgents.map(a => `- ${a.description}`).join('\n');

  return `# 任务协作

## 当前任务
${userMessage}

## 参与 Agent
${agentList}

## 协作要求
1. PM Agent 首先分析任务，拆分子任务
2. 根据任务需要，其他 Agent 贡献各自的专业能力
3. Agent 之间可以互相引用和协作
4. 最终由 PM Agent 汇总结果
5. 所有 Agent 用中文回复

请开始协作完成这个任务。`;
}

// 任务存储（内存中）
const tasks: Map<string, any> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userAvatar, content, messageHistory = [] } = body;

    const mentions = parseMentions(content);
    const targetAgents = getTargetAgents(mentions, content);

    // 创建任务
    const taskId = `task-${uuidv4()}`;
    const task = {
      id: taskId,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      description: content,
      status: 'in_progress',
      assigneeId: targetAgents.join(','),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    tasks.set(taskId, task);

    const config = await getConfig();

    // 检查 CLI 是否可用
    const cliCheck = await checkClaudeCLI();
    const hasAPIConfig = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    if (config.callMethod === 'cli') {
      if (!cliCheck.available) {
        return NextResponse.json({
          error: `Claude CLI 不可用: ${cliCheck.error}`,
          responses: [{
            agentId: 'pm',
            content: '抱歉，Claude CLI 不可用。请先安装并登录 Claude Code。',
          }],
          mentions,
          taskId,
          task,
        });
      }

      // 使用 CLI 多 Agent 协作模式
      // 构建所有 Agent 定义
      const agentsConfig: Record<string, ClaudeAgent> = {};
      for (const agentId of targetAgents) {
        if (AGENTS[agentId]) {
          agentsConfig[agentId] = AGENTS[agentId];
        }
      }

      const systemPrompt = buildCollaborationPrompt(targetAgents, content);

      console.log('[Claude CLI] Starting collaboration with agents:', targetAgents);
      console.log('[Claude CLI] System prompt:', systemPrompt.substring(0, 200) + '...');

      try {
        const response = await callClaudeCLI(
          {
            command: config.claudeCommand || 'claude',
            model: config.cliModel || 'claude-sonnet-4-6',
            agents: agentsConfig,
          },
          systemPrompt,
          `请分析并完成这个任务：${content}`
        );

        // 解析响应，尝试按 Agent 拆分
        const fullContent = response.content;
        const agentResponses = parseAgentResponses(fullContent, targetAgents);

        // 更新任务状态
        tasks.set(taskId, { ...task, status: 'completed', updatedAt: Date.now() });

        return NextResponse.json({
          responses: agentResponses,
          mentions,
          taskId,
          task: { ...task, status: 'completed' },
        });
      } catch (error: any) {
        console.error('CLI call error:', error);
        tasks.set(taskId, { ...task, status: 'failed', updatedAt: Date.now() });

        return NextResponse.json({
          error: error.message,
          responses: [{
            agentId: 'pm',
            content: `执行出错：${error.message}`,
          }],
          mentions,
          taskId,
          task: { ...task, status: 'failed' },
        });
      }
    } else {
      // API 方式（暂不支持多 Agent）
      return NextResponse.json({
        error: 'API 方式暂不支持多 Agent 协作，请使用 CLI 方式',
        responses: [{
          agentId: 'pm',
          content: '抱歉，API 方式暂不支持多 Agent 协作。请在设置中切换到 Claude Code CLI 方式。',
        }],
        mentions,
        taskId,
        task,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}

// 解析 Agent 响应，尝试按 Agent 拆分
function parseAgentResponses(fullContent: string, agentIds: string[]): Array<{ agentId: string; content: string }> {
  const responses: Array<{ agentId: string; content: string }> = [];

  // 尝试按 Agent 名称分割响应
  for (const agentId of agentIds) {
    const agentName = getAgentName(agentId);
    const regex = new RegExp(`#?${agentName}[^#]*`, 'gi');
    const matches = fullContent.match(regex);

    if (matches && matches.length > 0) {
      responses.push({
        agentId,
        content: cleanContent(matches.join('\n\n')),
      });
    }
  }

  // 如果无法拆分，返回整体作为 PM 响应
  if (responses.length === 0) {
    responses.push({
      agentId: 'pm',
      content: fullContent,
    });
  }

  return responses;
}

function getAgentName(agentId: string): string {
  const names: Record<string, string> = {
    pm: 'PM|项目经理',
    developer: 'Developer|开发者',
    tester: 'Tester|测试',
    designer: 'Designer|设计',
  };
  return names[agentId] || agentId;
}

function cleanContent(content: string): string {
  return content
    .replace(/^#+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// GET: 获取任务列表
export async function GET() {
  const taskList = Array.from(tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(taskList);
}
