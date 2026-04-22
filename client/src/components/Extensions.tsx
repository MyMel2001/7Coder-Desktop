import React, { useState, useEffect } from 'react';
import { Search, Download, PackageOpen } from 'lucide-react';
import { searchExtensions } from '../lib/openvsx';
import type { Extension } from '../lib/openvsx';

export function Extensions() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('7coder_installed_extensions') || '[]');
  });

  useEffect(() => {
    localStorage.setItem('7coder_installed_extensions', JSON.stringify(installed));
    // Trigger a storage event manually so other components/tabs can react
    window.dispatchEvent(new Event('storage'));
  }, [installed]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchExtensions(query);
      setResults(res);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleInstall = (extId: string) => {
    setInstalled(prev => 
      prev.includes(extId) ? prev.filter(id => id !== extId) : [...prev, extId]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">Extensions</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search Open VSX..."
            className="w-full bg-[#3c3c3c] border border-transparent rounded pl-7 pr-2 py-1 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-center text-xs text-gray-400 py-4">Searching...</div>}
        
        {!loading && results.map((ext) => {
          const extId = `${ext.namespace}.${ext.name}`;
          const isInstalled = installed.includes(extId);
          return (
            <div key={extId} className="flex p-2 hover:bg-[#2a2d2e] rounded cursor-pointer transition-colors border border-transparent hover:border-[#3c3c3c]">
              <img src={ext.iconUrl} alt="icon" className="w-10 h-10 object-contain rounded bg-white mr-3" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate text-[#e1e1e1]">{ext.displayName}</div>
                <div className="text-xs text-gray-500 truncate">{ext.description}</div>
                <div className="flex items-center text-[10px] text-gray-400 mt-1">
                  <span className="truncate mr-2">{ext.namespace}</span>
                  <span className="flex items-center ml-auto"><Download className="w-3 h-3 mr-1" />{ext.downloadCount}</span>
                </div>
              </div>
              <div className="ml-2 flex items-center">
                <button 
                  onClick={() => toggleInstall(extId)}
                  className={`${isInstalled ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300' : 'bg-blue-600 hover:bg-blue-500 text-white'} px-2 py-1 rounded text-xs transition-colors`}
                >
                  {isInstalled ? 'Uninstall' : 'Install'}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-8 text-gray-500 flex flex-col items-center">
            <PackageOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No extensions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
