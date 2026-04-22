import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Settings, Terminal, MessageSquare, Save, Play, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

type Mode = 'chat' | 'settings' | 'terminal';

interface AIHarnessProps {
  rootHandle: FileSystemDirectoryHandle | null;
  onFileEdit: (handle: FileSystemFileHandle) => void;
}

export function AIHarness({ rootHandle, onFileEdit }: AIHarnessProps) {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am your 7Coder Agent. I can now read and edit your workspace autonomously. How can I assist you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Settings
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('7coder_ai_url') || 'http://localhost:11434/v1');
  const [apiKey, setApiKey] = useState(localStorage.getItem('7coder_ai_key') || '');
  const [modelId, setModelId] = useState(localStorage.getItem('7coder_ai_model') || 'gpt-4o');
  const [contextLength, setContextLength] = useState(localStorage.getItem('7coder_ai_context') || '4096');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveSettings = () => {
    localStorage.setItem('7coder_ai_url', baseUrl);
    localStorage.setItem('7coder_ai_key', apiKey);
    localStorage.setItem('7coder_ai_model', modelId);
    localStorage.setItem('7coder_ai_context', contextLength);
    // Trigger sync
    window.dispatchEvent(new Event('storage'));
    setMode('chat');
  };

  // --- TOOL IMPLEMENTATIONS ---

  async function listFiles(path: string = '.') {
    if (!rootHandle) return "No workspace opened.";
    try {
      const files: string[] = [];
      for await (const entry of rootHandle.values()) {
        files.push(`${entry.kind === 'directory' ? '[DIR] ' : ''}${entry.name}`);
      }
      return files.join('\n');
    } catch (err: any) {
      return `Error listing files: ${err.message}`;
    }
  }

  async function readFile(filename: string) {
    if (!rootHandle) return "No workspace opened.";
    try {
      const fileHandle = await rootHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err: any) {
      return `Error reading file ${filename}: ${err.message}`;
    }
  }

  async function writeFile(filename: string, content: string) {
    if (!rootHandle) return "No workspace opened.";
    try {
      const fileHandle = await rootHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      onFileEdit(fileHandle); // Update editor
      return `Successfully wrote to ${filename}`;
    } catch (err: any) {
      return `Error writing to file ${filename}: ${err.message}`;
    }
  }

  // --- AGENT LOOP ---

  const callAgent = async (userQuery: string) => {
    if (!input.trim() && !userQuery) return;
    
    const query = userQuery || input;
    const newMessages: Message[] = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let currentMessages = [...newMessages];

    const tools = [
      {
        type: "function",
        function: {
          name: "list_files",
          description: "List files in the root workspace directory",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read the content of a file in the workspace",
          parameters: {
            type: "object",
            properties: {
              filename: { type: "string", description: "The name of the file to read" }
            },
            required: ["filename"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Write or update a file in the workspace",
          parameters: {
            type: "object",
            properties: {
              filename: { type: "string", description: "The name of the file to write" },
              content: { type: "string", description: "The content to write to the file" }
            },
            required: ["filename", "content"]
          }
        }
      }
    ];

    try {
      let keepRunning = true;
      while (keepRunning) {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelId,
            messages: currentMessages,
            tools: tools,
            tool_choice: "auto"
          })
        });

        const data = await response.json();
        const assistantMessage = data.choices[0].message;

        currentMessages.push(assistantMessage);
        setMessages([...currentMessages]);

        if (assistantMessage.tool_calls) {
          for (const toolCall of assistantMessage.tool_calls) {
            const name = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let result = "";

            if (name === "list_files") result = await listFiles();
            else if (name === "read_file") result = await readFile(args.filename);
            else if (name === "write_file") result = await writeFile(args.filename, args.content);

            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: name,
              content: result
            });
          }
          setMessages([...currentMessages]);
        } else {
          keepRunning = false;
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Please check your AI settings and connectivity.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-96 border-t border-[#333333] flex flex-col bg-[#252526] shadow-inner">
      {/* Tabs */}
      <div className="p-2 flex justify-between items-center border-b border-[#333333] bg-[#1e1e1e]">
        <div className="flex space-x-1">
          <button onClick={() => setMode('chat')} className={`p-1.5 rounded transition-colors ${mode === 'chat' ? 'text-purple-400 bg-[#333333]' : 'text-gray-500 hover:text-gray-300'}`}>
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => setMode('terminal')} className={`p-1.5 rounded transition-colors ${mode === 'terminal' ? 'text-green-400 bg-[#333333]' : 'text-gray-500 hover:text-gray-300'}`}>
            <Terminal className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {loading && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
            {mode === 'chat' ? 'Agentic Chat' : mode === 'settings' ? 'Configuration' : 'Terminal'}
          </span>
        </div>
        <button onClick={() => setMode(mode === 'settings' ? 'chat' : 'settings')} className={`p-1.5 rounded transition-colors ${mode === 'settings' ? 'text-blue-400 bg-[#333333]' : 'text-gray-500 hover:text-gray-300'}`}>
          <Settings className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {mode === 'chat' && (
          <div className="h-full flex flex-col">
            <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-4 bg-[#1e1e1e] scrollbar-thin">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'tool' ? (
                    <div className="text-[10px] text-gray-500 italic mb-1 flex items-center">
                      <Play className="w-2.5 h-2.5 mr-1 text-green-500" /> {msg.name} executed.
                    </div>
                  ) : msg.tool_calls ? (
                    <div className="bg-[#2d2d2d] border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px] text-blue-400 mb-2 flex items-center animate-pulse">
                      <Bot className="w-3.5 h-3.5 mr-2" /> Agent is calling {msg.tool_calls[0].function.name}...
                    </div>
                  ) : (
                    <div className={`px-3 py-2 rounded-lg max-w-[95%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#2d2d2d] text-gray-300 border border-[#3c3c3c]'}`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              {loading && !messages[messages.length-1].tool_calls && (
                <div className="flex items-start">
                  <div className="px-3 py-2 rounded-lg bg-[#2d2d2d] text-gray-300 border border-[#3c3c3c] text-sm animate-pulse">
                    Agent is thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#252526] border-t border-[#333333]">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Tell the agent to edit a file..." 
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && callAgent('')}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-purple-500 transition-all disabled:opacity-50"
                />
                <button 
                  onClick={() => callAgent('')}
                  disabled={loading}
                  className="absolute right-2 top-1.5 p-1 rounded-full text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'settings' && (
          <div className="h-full bg-[#1e1e1e] p-5 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Base URL</label>
              <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Model ID</label>
              <input type="text" value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Context Length</label>
              <input type="number" value={contextLength} onChange={(e) => setContextLength(e.target.value)} className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded shadow-lg transition-all flex items-center justify-center">
              <Save className="w-3.5 h-3.5 mr-2" /> Save & Exit
            </button>
          </div>
        )}

        {mode === 'terminal' && (
          <div className="h-full bg-black font-mono text-[11px] p-3 overflow-y-auto text-green-500/90 leading-relaxed">
            <div className="flex items-center text-gray-600 mb-2 border-b border-gray-900 pb-1 uppercase tracking-tighter">
              <Terminal className="w-3 h-3 mr-1" /> Agentic Process Output
            </div>
            {messages.filter(m => m.role === 'tool').map((m, i) => (
              <div key={i} className="mb-2">
                <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-yellow-500">TOOL_CALL:</span> {m.name}
                <pre className="mt-1 text-gray-400 whitespace-pre-wrap pl-4 border-l border-gray-800">{m.content}</pre>
              </div>
            ))}
            {loading && <div className="animate-pulse">_</div>}
          </div>
        )}
      </div>
    </div>
  );
}
