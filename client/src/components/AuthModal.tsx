import React, { useState } from 'react';
import { Lock, User, X } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onAuth: (userId: string, password: string) => void;
}

export function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId && password) {
      onAuth(userId, password);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#252526] border border-[#333333] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-[#333333] flex justify-between items-center bg-[#1e1e1e]">
          <h2 className="text-sm font-bold text-gray-300 flex items-center">
            <Lock className="w-4 h-4 mr-2 text-blue-400" /> Secure Sync
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">User ID</label>
            <div className="relative">
              <input
                autoFocus
                type="text"
                className="w-full bg-[#3c3c3c] border border-[#555555] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white pl-9"
                placeholder="Enter username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
              <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Password</label>
            <div className="relative">
              <input
                type="password"
                className="w-full bg-[#3c3c3c] border border-[#555555] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white pl-9"
                placeholder="Master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded text-sm transition-colors shadow-lg active:scale-95"
            >
              Sign In & Sync
            </button>
          </div>
          
          <p className="text-[10px] text-gray-500 text-center leading-tight mt-4">
            Data is encrypted locally with your password before being synced. 
            Lost passwords cannot be recovered.
          </p>
        </form>
      </div>
    </div>
  );
}
