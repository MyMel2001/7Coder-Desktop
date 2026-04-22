/**
 * Web Crypto E2E Encryption Utility
 */

const ITERATIONS = 100000;
const ALGO = 'AES-GCM';

async function deriveKey(password: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: any, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(JSON.stringify(data))
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64: string, password: string): Promise<any> {
  try {
    const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);
    
    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      data
    );
    
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data. Incorrect password?');
  }
}
