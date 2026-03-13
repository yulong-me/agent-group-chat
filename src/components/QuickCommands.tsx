'use client';

import { useState } from 'react';

interface QuickCommand {
  label: string;
  icon: string;
  command: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  { label: '写代码', icon: '💻', command: '帮我写一个' },
  { label: 'Debug', icon: '🐛', command: '帮我排查这个bug' },
  { label: '写测试', icon: '🧪', command: '帮我写测试用例' },
  { label: '设计界面', icon: '🎨', command: '设计一个' },
  { label: '分析需求', icon: '📋', command: '帮我分析需求' },
  { label: '代码审查', icon: '🔍', command: '帮我审查代码' },
  { label: '解释代码', icon: '📖', command: '解释这段代码' },
  { label: '优化性能', icon: '⚡', command: '帮我优化性能' },
];

interface QuickCommandsProps {
  onSelect: (command: string) => void;
}

export function QuickCommands({ onSelect }: QuickCommandsProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        title="快捷命令"
      >
        ⚡
      </button>

      {show && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2">
          <div className="grid grid-cols-2 gap-1">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => {
                  onSelect(cmd.command);
                  setShow(false);
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
              >
                <span>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
