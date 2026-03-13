'use client';

import { useState } from 'react';
import { useStore } from '@/store';

export function SessionList() {
  const { sessions, currentSessionId, createSession, switchSession, deleteSession, renameSession } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCreate = () => {
    createSession();
    setShowDropdown(false);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameSession(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个会话吗？')) {
      deleteSession(id);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        <span className="text-white text-sm max-w-[120px] truncate">
          {currentSession?.name || '新会话'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-700">
            <button
              onClick={handleCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建会话
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  switchSession(session.id);
                  setShowDropdown(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {editingId === session.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(session.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm outline-none"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm">{session.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(session.id);
                          setEditName(session.name);
                        }}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="p-1 hover:bg-red-600 rounded"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
