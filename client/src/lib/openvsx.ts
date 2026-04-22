export interface Extension {
  namespace: string;
  name: string;
  version: string;
  description: string;
  displayName: string;
  downloadCount: number;
  iconUrl: string;
}

export async function searchExtensions(query: string): Promise<Extension[]> {
  try {
    const res = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.extensions.map((ext: any) => ({
      namespace: ext.namespace,
      name: ext.name,
      version: ext.version,
      description: ext.description,
      displayName: ext.displayName || ext.name,
      downloadCount: ext.downloadCount,
      iconUrl: ext.iconUrl || 'https://open-vsx.org/default-icon.png'
    }));
  } catch (err) {
    console.error('Failed to search extensions:', err);
    return [];
  }
}
