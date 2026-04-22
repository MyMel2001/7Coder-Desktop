import React, { useState, useRef } from 'react';
import { FolderOpen, File as FileIcon, ChevronRight, ChevronDown, AlertCircle, Plus } from 'lucide-react';

interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  handle?: FileSystemHandle;
  children?: FileNode[];
  isOpen?: boolean;
  content?: string; // Fallback for browsers without FileSystemHandle
}

interface ExplorerProps {
  onFileSelect: (fileHandle: FileSystemFileHandle | File) => void;
  onRootLoaded: (handle: FileSystemDirectoryHandle) => void;
}

export function Explorer({ onFileSelect, onRootLoaded }: ExplorerProps) {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [isFileSystemSupported] = useState('showDirectoryPicker' in window);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createNewFile = async () => {
    if (!rootNode?.handle || rootNode.kind !== 'directory') return;
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const dirHandle = rootNode.handle as FileSystemDirectoryHandle;
      await dirHandle.getFileHandle(fileName, { create: true });
      
      // Refresh the root directory
      await loadDirectory(rootNode);
      setRootNode({ ...rootNode });
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const openFolder = async () => {
    if (isFileSystemSupported) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const root: FileNode = { name: dirHandle.name, kind: 'directory', handle: dirHandle, isOpen: true, children: [] };
        await loadDirectory(root);
        setRootNode(root);
        onRootLoaded(dirHandle);
      } catch (err) {
        console.error('Failed to open directory:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSafariFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Create a mock tree from flat file list
    const rootName = files[0].webkitRelativePath.split('/')[0] || 'Project';
    const root: FileNode = { name: rootName, kind: 'directory', isOpen: true, children: [] };

    Array.from(files).forEach(file => {
      const parts = file.webkitRelativePath.split('/').slice(1);
      let current = root;
      parts.forEach((part, i) => {
        const isLast = i === parts.length - 1;
        let existing = current.children?.find(c => c.name === part);
        if (!existing) {
          existing = { 
            name: part, 
            kind: isLast ? 'file' : 'directory', 
            children: isLast ? undefined : [],
            // @ts-ignore - attaching File object directly for fallback
            handle: isLast ? file : undefined 
          };
          current.children = [...(current.children || []), existing];
        }
        current = existing;
      });
    });

    setRootNode(root);
    // Even without full FileSystemHandle, we notify App of the root structure
    onRootLoaded(null as any); 
  };

  const loadDirectory = async (node: FileNode) => {
    if (node.kind !== 'directory' || !node.handle) return;
    const children: FileNode[] = [];
    const dirHandle = node.handle as any;
    for await (const entry of dirHandle.values()) {
      children.push({ name: entry.name, kind: entry.kind, handle: entry });
    }
    children.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
    node.children = children;
  };

  const toggleDirectory = async (node: FileNode, refresh: () => void) => {
    if (node.kind === 'directory') {
      node.isOpen = !node.isOpen;
      if (node.isOpen && isFileSystemSupported && node.handle && (!node.children || node.children.length === 0)) {
        await loadDirectory(node);
      }
      refresh();
    }
  };

  const renderNode = (node: FileNode, depth: number) => {
    const isDir = node.kind === 'directory';
    return (
      <div key={node.name} className="flex flex-col">
        <div 
          className="flex items-center px-2 py-1 hover:bg-[#37373d] cursor-pointer text-sm transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (isDir) {
              toggleDirectory(node, () => setRootNode({ ...rootNode! }));
            } else {
              // @ts-ignore
              onFileSelect(node.handle);
            }
          }}
        >
          {isDir ? (
            node.isOpen ? <ChevronDown className="w-3.5 h-3.5 mr-1 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-gray-400" />
          ) : (
            <FileIcon className="w-3.5 h-3.5 mr-1 ml-4.5 text-blue-400/60" />
          )}
          <span className="truncate text-gray-300 group-hover:text-white transition-colors" title={node.name}>{node.name}</span>
        </div>
        {isDir && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="p-3 flex justify-between items-center border-b border-[#333333]">
        <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-1">Explorer</h2>
        {rootNode && (
          <button 
            onClick={createNewFile}
            className="p-1 hover:bg-[#333333] rounded text-gray-400 hover:text-white transition-colors"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {!rootNode ? (
          <div className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-sm text-gray-400 mb-6 px-4">Open a folder to start coding with your agent.</p>
            <button 
              onClick={openFolder}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold transition-all shadow-lg active:scale-95 flex items-center"
            >
              <FolderOpen className="w-4 h-4 mr-2" /> Open Folder
            </button>
            {!isFileSystemSupported && (
              <p className="mt-4 text-[10px] text-yellow-500/70 flex items-center justify-center px-4">
                <AlertCircle className="w-3 h-3 mr-1" /> Safari detected: Using folder upload fallback.
              </p>
            )}
            <input 
              type="file" 
              // @ts-ignore
              webkitdirectory="" 
              directory="" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleSafariFallback}
            />
          </div>
        ) : (
          <div className="py-2">
            <div className="px-4 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-l-2 border-blue-500 bg-blue-500/5">
              {rootNode.name}
            </div>
            {rootNode.children?.map(child => renderNode(child, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
