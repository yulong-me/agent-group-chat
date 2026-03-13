import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { checkClaudeCLI, ClaudeAgent } from '@/lib/claude-cli';

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
- 用 Markdown 代码块展示代码`,
  },
  tester: {
    description: '测试工程师 - 测试用例、代码审查',
    prompt: `你是一个专业的QA工程师（Tester Agent）。

你的职责：
1. 编写测试用例
2. 代码审查
3. 发现并报告问题

当被分配任务时：
- 编写测试计划
- 指出代码中的潜在问题
- 提供测试用例`,
  },
  designer: {
    description: '设计师 - UI/UX 设计建议',
    prompt: `你是一个专业的UI/UX设计师（Designer Agent）。

你的职责：
1. 提供界面设计方案
2. 优化用户体验

当被分配任务时：
- 提供设计建议
- 描述界面布局`,
  },
};

// 解析 @提及
function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const mentions: string[] = [];
  let match;

  const roleMap: Record<string, string> = {
    'PM': 'pm', '产品经理': 'pm',
    '开发': 'developer', 'Developer': 'developer', '程序': 'developer',
    '测试': 'tester', 'Tester': 'tester', 'QA': 'tester',
    '设计': 'designer', 'Designer': 'designer',
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

function getTargetAgents(mentions: string[], content: string): string[] {
  if (mentions.length > 0) return mentions;

  const agents = ['pm'];
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('代码') || lowerContent.includes('开发') || lowerContent.includes('实现')) {
    agents.push('developer');
  }
  if (lowerContent.includes('测试') || lowerContent.includes('bug') || lowerContent.includes('错误')) {
    agents.push('tester');
  }
  if (lowerContent.includes('设计') || lowerContent.includes('界面') || lowerContent.includes('UI')) {
    agents.push('designer');
  }

  return [...new Set(agents)];
}

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
2. 其他 Agent 贡献专业能力
3. 最终由 PM Agent 汇总结果
4. 所有 Agent 用中文回复

请开始协作完成这个任务。`;
}

// 任务存储
const tasks: Map<string, any> = new Map();

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { userId, userName, userAvatar, content, messageHistory = [] } = body;

        sendEvent('status', { status: 'started', message: '开始处理任务...' });

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

        sendEvent('task', { task });

        // 检查 CLI 可用性
        sendEvent('status', { status: 'checking', message: '检查 Claude CLI...' });
        const cliCheck = await checkClaudeCLI();

        if (!cliCheck.available) {
          sendEvent('error', { message: `Claude CLI 不可用: ${cliCheck.error}` });
          sendEvent('status', { status: 'failed', message: 'Claude CLI 不可用' });
          controller.close();
          return;
        }

        sendEvent('status', { status: 'ready', message: 'Claude CLI 已就绪' });

        // 构建 Agent 定义
        const agentsConfig: Record<string, ClaudeAgent> = {};
        for (const agentId of targetAgents) {
          if (AGENTS[agentId]) agentsConfig[agentId] = AGENTS[agentId];
        }

        const systemPrompt = buildCollaborationPrompt(targetAgents, content);

        // 构建 CLI 命令参数
        const command = 'claude';
        const args = [
          '--print',
          '-',
          '--output-format', 'stream-json',
          '--verbose',
        ];

        // 添加 agents 配置
        if (Object.keys(agentsConfig).length > 0) {
          args.push('--agents', JSON.stringify(agentsConfig));
        }

        // 添加 model
        args.push('--model', 'claude-sonnet-4-6');

        // 构建完整 prompt
        const fullPrompt = `${systemPrompt}\n\n请分析并完成这个任务：${content}`;

        console.log('[SSE] Running:', command, args.join(' '));

        // 启动子进程
        const childEnv = { ...process.env };
        delete childEnv.CLAUDECODE;

        const child = spawn(command, args, {
          cwd: process.cwd(),
          env: childEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdoutData = '';
        let stderrData = '';
        let accumulatedText = ''; // 累积纯文本内容

        child.stdout?.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          stdoutData += text;

          // 解析 JSON 流
          const lines = text.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);

              // 处理不同类型的事件
              // 格式1: content_block_delta (增量文本)
              if (data.type === 'content_block_delta') {
                if (data.delta?.type === 'text_delta') {
                  const contentText = data.delta.text;
                  accumulatedText += contentText;
                  sendEvent('content', { text: contentText, agent: 'current' });
                }
              }
              // 格式2: assistant message (完整消息)
              else if (data.type === 'assistant' && data.message?.content) {
                for (const block of data.message.content) {
                  if (block.type === 'text') {
                    const contentText = block.text || '';
                    accumulatedText += contentText;
                    sendEvent('content', { text: contentText, agent: 'current' });
                  } else if (block.type === 'thinking') {
                    sendEvent('thinking', { type: 'thinking', content: block.thinking });
                  }
                }
                if (data.message.usage?.output_tokens) {
                  sendEvent('progress', { outputTokens: data.message.usage.output_tokens });
                }
              }
              // 格式3: result (最终结果)
              else if (data.type === 'result') {
                if (data.result && !accumulatedText.includes(data.result)) {
                  accumulatedText += data.result;
                  sendEvent('content', { text: data.result, agent: 'current' });
                }
                sendEvent('status', { status: 'completed', message: '处理完成' });
              }
              // 初始化事件
              else if (data.type === 'system') {
                sendEvent('status', { status: 'ready', message: 'Claude CLI 已就绪' });
              }
              // 错误事件
              else if (data.type === 'error' || data.subtype === 'error') {
                sendEvent('error', { message: data.message || data.error || 'Unknown error' });
              }
            } catch {
              // 非 JSON 行可能是普通文本或错误信息
              if (line.trim() && !line.startsWith('{')) {
                // 检查是否包含错误信息
                if (line.includes('Error') || line.includes('error')) {
                  sendEvent('error', { message: line.trim() });
                }
              }
            }
          }
        });

        child.stderr?.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          stderrData += text;

          // 检查嵌套会话错误
          if (text.includes('cannot be launched inside another Claude Code session')) {
            sendEvent('error', { message: '不能在 Claude Code 会话中调用 CLI' });
          }
        });

        // 写入 stdin
        child.stdin?.write(fullPrompt);
        child.stdin?.end();

        // 超时处理
        const timeoutMs = 120000; // 2分钟
        const timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          sendEvent('error', { message: '任务处理超时 (2分钟)' });
          sendEvent('status', { status: 'timeout', message: '处理超时' });
          tasks.set(taskId, { ...task, status: 'failed', updatedAt: Date.now() });
        }, timeoutMs);

        child.on('close', (code) => {
          clearTimeout(timeoutId);

          // 如果没有发送完成事件，手动发送
          if (!accumulatedText) {
            // 从 stdoutData 尝试提取 result
            const lines = stdoutData.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.type === 'result' && data.result) {
                  accumulatedText = data.result;
                  break;
                }
              } catch {}
            }
          }

          // 使用累积的纯文本解析响应
          const responses = parseAgentResponses(accumulatedText, targetAgents);

          tasks.set(taskId, { ...task, status: code === 0 ? 'completed' : 'failed', updatedAt: Date.now() });

          sendEvent('done', {
            responses,
            task: { ...task, status: code === 0 ? 'completed' : 'failed' },
          });
          controller.close();
        });

        child.on('error', (error) => {
          clearTimeout(timeoutId);
          sendEvent('error', { message: error.message });
          sendEvent('status', { status: 'error', message: error.message });
          tasks.set(taskId, { ...task, status: 'failed', updatedAt: Date.now() });
          controller.close();
        });

      } catch (error: any) {
        sendEvent('error', { message: error.message });
        sendEvent('status', { status: 'error', message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function parseAgentResponses(fullContent: string, agentIds: string[]): Array<{ agentId: string; content: string }> {
  const responses: Array<{ agentId: string; content: string }> = [];

  for (const agentId of agentIds) {
    const agentName = getAgentName(agentId);
    const regex = new RegExp(`#?${agentName}[^#]*`, 'gi');
    const matches = fullContent.match(regex);

    if (matches && matches.length > 0) {
      responses.push({ agentId, content: cleanContent(matches.join('\n\n')) });
    }
  }

  if (responses.length === 0) {
    responses.push({ agentId: 'pm', content: fullContent });
  }

  return responses;
}

function getAgentName(AgentId: string): string {
  const names: Record<string, string> = {
    pm: 'PM|项目经理',
    developer: 'Developer|开发者',
    tester: 'Tester|测试',
    designer: 'Designer|设计',
  };
  return names[AgentId] || AgentId;
}

function cleanContent(content: string): string {
  return content.replace(/^#+\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

export async function GET() {
  const taskList = Array.from(tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  return Response.json(taskList);
}
