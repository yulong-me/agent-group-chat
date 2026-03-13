'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Config {
  callMethod: 'api' | 'cli';
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  apiBaseUrl: string;
  claudeCommand: string;
  cliModel: string;
}

const API_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4.6 (最新)' },
  { id: 'claude-opus-4-6-20250514', label: 'Claude Opus 4.6' },
  { id: 'claude-haiku-4-6-20250514', label: 'Claude Haiku 4.6' },
];

const CLI_MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-6', label: 'Claude Haiku 4.6' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({
    callMethod: 'cli',
    anthropicApiKey: '',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
    apiBaseUrl: 'https://api.anthropic.com',
    claudeCommand: 'claude',
    cliModel: 'claude-sonnet-4-6',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [cliStatus, setCliStatus] = useState<{ available: boolean; version?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig((prev) => ({
          ...prev,
          callMethod: data.callMethod || 'cli',
          anthropicApiKey: data.anthropicApiKey || '',
          model: data.model || prev.model,
          maxTokens: data.maxTokens || prev.maxTokens,
          apiBaseUrl: data.apiBaseUrl || prev.apiBaseUrl,
          claudeCommand: data.claudeCommand || prev.claudeCommand,
          cliModel: data.cliModel || prev.cliModel,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check CLI status
    fetch('/api/test-connection')
      .then((res) => res.json())
      .then((data) => setCliStatus(data.cli))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        alert('配置已保存');
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callMethod: config.callMethod,
          apiKey: config.anthropicApiKey,
          model: config.callMethod === 'api' ? config.model : undefined,
          apiBaseUrl: config.apiBaseUrl,
          claudeCommand: config.callMethod === 'cli' ? config.claudeCommand : undefined,
          cliModel: config.callMethod === 'cli' ? config.cliModel : undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        details: data.details,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '测试连接失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    if (confirm('确定要清除所有配置吗？')) {
      await fetch('/api/config', { method: 'DELETE' });
      setConfig({
        callMethod: 'cli',
        anthropicApiKey: '',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 1024,
        apiBaseUrl: 'https://api.anthropic.com',
        claudeCommand: 'claude',
        cliModel: 'claude-sonnet-4-6',
      });
      setTestResult(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-xl font-semibold text-white">设置</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Claude CLI 状态 */}
        <section className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🦊</span>
              <div>
                <h3 className="font-medium text-white">Claude Code CLI</h3>
                <p className="text-sm text-gray-400">
                  {cliStatus?.available ? (
                    <span className="text-green-400">已安装 ({cliStatus.version})</span>
                  ) : (
                    <span className="text-red-400">未安装</span>
                  )}
                </p>
              </div>
            </div>
            {!cliStatus?.available && (
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                安装指南 →
              </a>
            )}
          </div>
        </section>

        {/* 调用方式选择 */}
        <section className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">调用方式</h2>

          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="callMethod"
                value="cli"
                checked={config.callMethod === 'cli'}
                onChange={() => setConfig({ ...config, callMethod: 'cli' })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">🦊 Claude Code CLI (本地)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="callMethod"
                value="api"
                checked={config.callMethod === 'api'}
                onChange={() => setConfig({ ...config, callMethod: 'api' })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">🌐 Anthropic API</span>
            </label>
          </div>

          <p className="text-sm text-gray-400">
            {config.callMethod === 'cli'
              ? '使用本地安装的 Claude Code CLI，无需 API Key（需订阅或本地登录）'
              : '使用 Anthropic HTTP API，需要 API Key'}
          </p>
        </section>

        {/* CLI 配置 */}
        {config.callMethod === 'cli' && (
          <section className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Claude Code CLI 配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CLI 命令
                </label>
                <input
                  type="text"
                  value={config.claudeCommand}
                  onChange={(e) => setConfig({ ...config, claudeCommand: e.target.value })}
                  placeholder="claude"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  模型
                </label>
                <select
                  value={config.cliModel}
                  onChange={(e) => setConfig({ ...config, cliModel: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {CLI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* API 配置 */}
        {config.callMethod === 'api' && (
          <section className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">API 配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API 端点地址
                </label>
                <input
                  type="url"
                  value={config.apiBaseUrl}
                  onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                  placeholder="https://api.anthropic.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.anthropicApiKey}
                  onChange={(e) => setConfig({ ...config, anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  模型
                </label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {API_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Test Result */}
        {testResult && (
          <section className="bg-gray-900 rounded-lg p-6 mb-6">
            <div
              className={`p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-900/30 border border-green-800'
                  : 'bg-red-900/30 border border-red-800'
              }`}
            >
              <p
                className={`text-sm ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {testResult.message}
              </p>
              {testResult.details && (
                <div className="mt-2 text-xs text-green-300">
                  {testResult.details.version && <p>版本: {testResult.details.version}</p>}
                  {testResult.details.model && <p>模型: {testResult.details.model}</p>}
                  {testResult.details.response && <p>响应: {testResult.details.response}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Buttons */}
        <section className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg font-medium transition-colors"
          >
            清除配置
          </button>
        </section>
      </div>
    </div>
  );
}
