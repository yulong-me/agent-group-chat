import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ClaudeAgent {
  description: string;
  prompt: string;
}

export interface ClaudeCLIConfig {
  command?: string; // CLI 命令，默认 'claude'
  model?: string; // 模型 ID
  cwd?: string; // 工作目录
  env?: Record<string, string>; // 环境变量
  effort?: 'low' | 'medium' | 'high'; // 推理 effort
  maxTurns?: number; // 最大对话轮次
  agents?: Record<string, ClaudeAgent>; // 自定义 Agent 团队
  agent?: string; // 使用的 Agent 名称
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  sessionId?: string;
  model?: string;
}

/**
 * 检查 Claude CLI 是否可用
 */
export async function checkClaudeCLI(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const { stdout } = await execAsync('claude --version');
    const version = stdout.trim();
    return { available: true, version };
  } catch (error: any) {
    return {
      available: false,
      error: error.message || 'Claude CLI not found',
    };
  }
}

/**
 * 构建完整的 CLI 命令参数
 */
function buildCLIArgs(config: ClaudeCLIConfig): string[] {
  const args: string[] = [];

  // --print: 输出结果而非交互式
  args.push('--print');

  // -: 从 stdin 读取输入
  args.push('-');

  // --output-format stream-json: JSON 流格式输出
  args.push('--output-format', 'stream-json');

  // --verbose: 详细输出
  args.push('--verbose');

  // --agents: 定义 Agent 团队 (JSON)
  if (config.agents && Object.keys(config.agents).length > 0) {
    args.push('--agents', JSON.stringify(config.agents));
  }

  // --agent: 选择使用的 Agent
  if (config.agent) {
    args.push('--agent', config.agent);
  }

  // --model: 指定模型
  if (config.model) {
    args.push('--model', config.model);
  }

  // --effort: 推理 effort
  if (config.effort) {
    args.push('--effort', config.effort);
  }

  // --max-turns: 最大轮次
  if (config.maxTurns) {
    args.push('--max-turns', String(config.maxTurns));
  }

  return args;
}

/**
 * 解析 Claude CLI 的 JSON 流输出
 */
function parseClaudeOutput(stdout: string): ClaudeResponse {
  const lines = stdout.split('\n').filter(Boolean);
  const parts: string[] = [];
  let usage: ClaudeResponse['usage'];
  let sessionId: string | undefined;
  let model: string | undefined;

  for (const line of lines) {
    try {
      const data = JSON.parse(line);

      // 类型: content_block_delta - 内容片段
      if (data.type === 'content_block_delta') {
        if (data.delta?.type === 'text_delta') {
          parts.push(data.delta.text);
        }
      }
      // 类型: message_stop - 消息结束
      else if (data.type === 'message_stop') {
        // 可能包含 usage
        if (data.usage) {
          usage = {
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0,
          };
        }
      }
      // 类型: message_start - 消息开始
      else if (data.type === 'message_start') {
        if (data.message?.model) {
          model = data.message.model;
        }
        if (data.message?.usage) {
          usage = {
            inputTokens: data.message.usage.input_tokens || 0,
            outputTokens: data.message.usage.output_tokens || 0,
          };
        }
      }
      // 类型: message_delta - 消息增量（包含 session_id）
      else if (data.type === 'message_delta') {
        if (data.session_id) {
          sessionId = data.session_id;
        }
        if (data.usage?.output_tokens) {
          usage = {
            inputTokens: usage?.inputTokens || 0,
            outputTokens: data.usage.output_tokens,
          };
        }
      }
      // 类型: content_block_start/content_block_stop
      else if (data.type === 'content_block_start' || data.type === 'content_block_stop') {
        // 忽略
      }
      // 如果有 result 字段（某些格式）
      else if (data.result) {
        parts.push(data.result);
      }
    } catch {
      // 非 JSON 行可能是普通文本
      if (line.trim() && !line.startsWith('{')) {
        parts.push(line.trim());
      }
    }
  }

  return {
    content: parts.join(''),
    usage,
    sessionId,
    model,
  };
}

/**
 * 调用 Claude CLI
 */
export async function callClaudeCLI(
  config: ClaudeCLIConfig,
  systemPrompt: string,
  userMessage: string,
  timeoutMs: number = 30000 // 默认30秒超时
): Promise<ClaudeResponse> {
  const command = config.command || 'claude';
  const args = buildCLIArgs(config);

  // 构建完整 prompt（system prompt + user message）
  const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

  console.log('[Claude CLI] Running:', command, args.join(' '));

  // 启动子进程 - 需要移除 CLAUDECODE 环境变量避免嵌套调用
  const childEnv = { ...process.env };
  delete childEnv.CLAUDECODE; // 移除嵌套调用限制
  Object.assign(childEnv, config.env);

  const child = spawn(command, args, {
    cwd: config.cwd || process.cwd(),
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    // 超时处理
    const timeoutId = setTimeout(() => {
      console.log('[Claude CLI] Timeout, killing process');
      child.kill('SIGTERM');
      reject(new Error('Claude CLI 调用超时 (60秒)'));
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const stdout = Buffer.concat(stdoutChunks).toString();
      const stderr = Buffer.concat(stderrChunks).toString();

      if (code === 0) {
        try {
          const response = parseClaudeOutput(stdout);
          console.log('[Claude CLI] Success, output tokens:', response.usage?.outputTokens);
          resolve(response);
        } catch (error) {
          // 解析失败，返回原始输出
          resolve({
            content: stdout || '无法解析输出',
          });
        }
      } else {
        console.error('[Claude CLI] Error:', stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // 写入 stdin
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
}

/**
 * 简单调用 - 返回纯文本
 */
export async function callClaudeCLISimple(
  config: ClaudeCLIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await callClaudeCLI(config, systemPrompt, userMessage);
  return response.content;
}

/**
 * 测试 Claude CLI 连接
 */
export async function testClaudeCLIConnection(config: ClaudeCLIConfig): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  // 首先检查 CLI 是否可用
  const check = await checkClaudeCLI();
  if (!check.available) {
    return {
      success: false,
      message: `Claude CLI 不可用: ${check.error}`,
    };
  }

  try {
    const response = await callClaudeCLI(
      {
        command: config.command || 'claude',
        model: config.model || 'claude-sonnet-4-6',
      },
      '你是一个AI助手。请简洁回复。',
      '请回复 "连接成功"'
    );

    return {
      success: true,
      message: `连接成功！`,
      details: {
        version: check.version,
        model: response.model,
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens,
        responsePreview: response.content.substring(0, 100),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `调用失败: ${error.message}`,
    };
  }
}
