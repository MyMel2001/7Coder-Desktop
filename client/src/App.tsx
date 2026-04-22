import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Files, Blocks, User, ShieldCheck, Save } from 'lucide-react';
import { Extensions } from './components/Extensions';
import { Explorer } from './components/Explorer';
import { AIHarness } from './components/AIHarness';
import { AuthModal } from './components/AuthModal';
import { encryptData, decryptData } from './lib/crypto';

type ViewMode = 'explorer' | 'extensions';

const getLanguageByFilename = (filename: string): string => {
  if (filename === '.env' || filename.endsWith('.env')) return 'ini';
  if (filename.toLowerCase() === 'cargo.toml') return 'toml';
  
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sql':
      return 'sql';
    case 'xml':
      return 'xml';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'toml':
      return 'toml';
    case 'ini':
      return 'ini';
    default:
      return 'plaintext';
  }
};

function App() {
  const [code, setCode] = useState<string>('// Welcome to 7Coder Desktop\n// Open a folder in the Explorer to get started!');
  const [activeFile, setActiveFile] = useState<string>('Welcome');
  const [activeHandle, setActiveHandle] = useState<FileSystemFileHandle | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<Map<string, { handle: FileSystemFileHandle, content: string }>>(new Map());
  const [tabs, setTabs] = useState<{ name: string, handle: FileSystemFileHandle | null }[]>([]);
  const [explorerRefreshTrigger, setExplorerRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<ViewMode>('explorer');
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('7coder_user'));
  const [password, setPassword] = useState<string | null>(sessionStorage.getItem('7coder_pw'));
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (userId && password) {
      loadSyncedData();
    }
  }, [userId, password]);

  // Auto-sync whenever local storage changes (triggered by components)
  useEffect(() => {
    const handleStorageChange = () => {
      if (userId && password) {
        syncSettings();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId, password]);

  const loadSyncedData = async () => {
    try {
      const res = await fetch(`http://localhost:2469/api/sync/${userId}`);
      const result = await res.json();
      if (result.data) {
        const decrypted = await decryptData(result.data, password!);
        console.log('E2E Decrypted Data Loaded:', decrypted);
        
        // Apply to local storage
        if (decrypted.ai) {
          localStorage.setItem('7coder_ai_url', decrypted.ai.url);
          localStorage.setItem('7coder_ai_key', decrypted.ai.key);
          localStorage.setItem('7coder_ai_model', decrypted.ai.model);
          localStorage.setItem('7coder_ai_context', decrypted.ai.context);
        }
        if (decrypted.extensions) {
          localStorage.setItem('7coder_installed_extensions', JSON.stringify(decrypted.extensions));
        }
        // Force update of UI by triggering event
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('Failed to load/decrypt sync data:', err);
    }
  };

  const syncSettings = async () => {
    if (!userId || !password) return;
    try {
      const syncObject = {
        ai: {
          url: localStorage.getItem('7coder_ai_url'),
          key: localStorage.getItem('7coder_ai_key'),
          model: localStorage.getItem('7coder_ai_model'),
          context: localStorage.getItem('7coder_ai_context'),
        },
        extensions: JSON.parse(localStorage.getItem('7coder_installed_extensions') || '[]'),
        timestamp: new Date().toISOString()
      };

      const encrypted = await encryptData(syncObject, password);
      await fetch('http://localhost:2469/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data: encrypted })
      });
      console.log('Encrypted settings synced to backend');
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  const handleAuth = async (id: string, pw: string) => {
    setUserId(id);
    setPassword(pw);
    localStorage.setItem('7coder_user', id);
    sessionStorage.setItem('7coder_pw', pw);
    setShowAuthModal(false);
    
    // Immediately try to load existing data
    // The loadSyncedData useEffect will trigger since userId/password changed
  };

  const logout = () => {
    setUserId(null);
    setPassword(null);
    localStorage.removeItem('7coder_user');
    sessionStorage.removeItem('7coder_pw');
  };

  const saveFile = async () => {
    if (!activeHandle) return;
    try {
      const writable = await activeHandle.createWritable();
      await writable.write(code);
      await writable.close();
      
      setDirtyFiles(prev => {
        const next = new Map(prev);
        next.delete(activeFile);
        return next;
      });
      
      console.log('File saved successfully');
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const saveAll = async () => {
    try {
      for (const [name, { handle, content }] of dirtyFiles.entries()) {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        console.log(`Saved ${name}`);
      }
      setDirtyFiles(new Map());
    } catch (err) {
      console.error('Failed to save all files:', err);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (activeHandle) {
      setDirtyFiles(prev => {
        const next = new Map(prev);
        next.set(activeFile, { handle: activeHandle, content: newCode });
        return next;
      });
    }
  };

  const handleFileSelect = async (handle: FileSystemFileHandle | File) => {
    try {
      let content = '';
      let name = '';
      
      if ('getFile' in handle) {
        // FileSystemFileHandle (Chromium)
        name = (handle as FileSystemFileHandle).name;
        console.log('File selected (handle):', name);
        
        // Add to tabs if not present
        setTabs(prev => {
          if (prev.find(t => t.name === name)) return prev;
          return [...prev, { name, handle: handle as FileSystemFileHandle }];
        });
        
        // Check if we have dirty (unsaved) content for this file
        if (dirtyFiles.has(name)) {
          content = dirtyFiles.get(name)!.content;
        } else {
          const file = await (handle as FileSystemFileHandle).getFile();
          content = await file.text();
        }
        
        setActiveHandle(handle as FileSystemFileHandle);
      } else {
        // File object (Safari Fallback)
        name = (handle as File).name;
        console.log('File selected (File object):', name);
        
        setTabs(prev => {
          if (prev.find(t => t.name === name)) return prev;
          return [...prev, { name, handle: null }];
        });
        
        content = await (handle as File).text();
        setActiveHandle(null);
      }
      
      setCode(content);
      setActiveFile(name);
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  const closeTab = (index: number) => {
    setTabs(prev => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed && removed.name === activeFile) {
        // If we closed the active tab, switch to another or welcome
        if (next.length > 0) {
          const newTab = next[next.length - 1];
          if (newTab.handle) handleFileSelect(newTab.handle);
          else setActiveFile(newTab.name);
        } else {
          setActiveFile('Welcome');
          setActiveHandle(null);
          setCode('// Welcome to 7Coder Desktop\n// Open a folder in the Explorer to get started!');
        }
      }
      return next;
    });
  };

  const triggerExplorerRefresh = () => {
    setExplorerRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      
      {/* Activity Bar */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-4 justify-between h-full border-r border-black/20">
        <div className="space-y-6 flex flex-col items-center">
          <button 
            onClick={() => setActiveView('explorer')}
            className={`p-2 rounded cursor-pointer transition-all ${activeView === 'explorer' ? 'text-white bg-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Files className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('extensions')}
            className={`p-2 rounded cursor-pointer transition-all ${activeView === 'extensions' ? 'text-white bg-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Blocks className="w-6 h-6" />
          </button>
        </div>
        
        <div className="pb-4 relative group">
          {userId && (
            <div className="absolute bottom-full left-full mb-2 ml-2 hidden group-hover:block bg-[#252526] border border-[#333333] p-2 rounded shadow-xl whitespace-nowrap z-50">
              <p className="text-xs font-bold text-gray-300">{userId}</p>
              <p className="text-[10px] text-green-500 flex items-center mt-1">
                <ShieldCheck className="w-3 h-3 mr-1" /> E2E Encrypted
              </p>
              <button onClick={logout} className="text-[10px] text-red-400 hover:text-red-300 mt-2 block w-full text-left">Logout</button>
            </div>
          )}
          <button 
            onClick={() => userId ? null : setShowAuthModal(true)}
            className={`p-2 rounded cursor-pointer transition-colors ${userId ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'}`}
            title={userId ? `Secured as ${userId}` : 'Sign In'}
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Sidebar Area */}
      <div className="w-64 border-r border-[#333333] flex flex-col bg-[#252526] shadow-xl">
        <div className="p-4 border-b border-[#333333] bg-[#1e1e1e] flex items-center justify-between">
          <h1 className="text-sm font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-purple-500">7CODER</h1>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {activeView === 'explorer' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                <Explorer 
                  onFileSelect={handleFileSelect} 
                  onRootLoaded={setRootHandle} 
                  refreshTrigger={explorerRefreshTrigger}
                />
              </div>
              <AIHarness 
                rootHandle={rootHandle} 
                onFileEdit={handleFileSelect} 
                tabs={tabs}
                onCloseTab={closeTab}
                onRefreshExplorer={triggerExplorerRefresh}
              />
            </div>
          )}

          {activeView === 'extensions' && <Extensions />}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-0 border-b border-black/20">
          <div className="flex items-center h-full overflow-x-auto whitespace-nowrap scrollbar-hide">
            {tabs.map((tab, idx) => (
              <div 
                key={`${tab.name}-${idx}`}
                onClick={() => tab.handle ? handleFileSelect(tab.handle) : setActiveFile(tab.name)}
                className={`px-4 py-2 h-full text-[12px] font-medium border-r border-black/10 cursor-pointer flex items-center group transition-colors ${activeFile === tab.name ? 'bg-[#1e1e1e] border-t-2 border-blue-500 text-white' : 'bg-[#2d2d2d] text-gray-500 hover:bg-[#323233] hover:text-gray-300'}`}
              >
                <span className="truncate max-w-[120px]">{tab.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(idx);
                  }}
                  className={`ml-2 p-0.5 rounded-sm hover:bg-[#454545] transition-opacity ${activeFile === tab.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <span className="w-3 h-3 flex items-center justify-center text-[10px]">✕</span>
                </button>
              </div>
            ))}
            {tabs.length === 0 && (
              <div className="px-4 py-2 h-full bg-[#1e1e1e] text-[12px] font-medium border-t-2 border-blue-500 cursor-pointer flex items-center">
                {activeFile}
              </div>
            )}
          </div>
          
          <div className="flex items-center px-4 space-x-2">
            <button 
              onClick={saveAll}
              disabled={dirtyFiles.size === 0}
              className={`flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold rounded transition-all border ${dirtyFiles.size > 0 ? 'bg-[#333333] hover:bg-[#444444] text-gray-300 border-[#444444] active:scale-95' : 'bg-transparent text-gray-700 border-gray-800/50 cursor-not-allowed opacity-40'}`}
              title="Save All Files"
            >
              <span>Save All</span>
              {dirtyFiles.size > 0 && <span className="bg-blue-600 text-white px-1.5 rounded-full text-[9px]">{dirtyFiles.size}</span>}
            </button>
            <button 
              onClick={saveFile}
              disabled={!activeHandle}
              className={`flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold rounded transition-all shadow-lg ${activeHandle ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
              title="Save File"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-[#1e1e1e] relative">
          <Editor
            height="100%"
            language={getLanguageByFilename(activeFile)}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              formatOnPaste: true,
              lineNumbersMinChars: 3,
            }}
          />
        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onAuth={handleAuth} 
        />
      )}
    </div>
  );
}

export default App;
