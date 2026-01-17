
/**
 * Simple SHA-256 hashing using the Web Crypto API
 */
export async function hashCode(code: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hash of "LLUMINA2026"
const PRO_CODE_HASH = '46961c028e5c8e1a1219b1695a746535d461017812f275215c9918544d62325c';

/**
 * Validates the provided code against the Pro hash
 */
export async function validateProCode(code: string): Promise<boolean> {
  const hashed = await hashCode(code.toUpperCase());
  return hashed === PRO_CODE_HASH;
}

/**
 * Basic input sanitization to prevent XSS and injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 500); // Max length
}

/**
 * "Quantum Obfuscation" - Simple XOR cipher for local data protection
 */
export function obfuscateData(data: string, key: string = 'LLUMINA_SECURE_2026'): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

export function deobfuscateData(obfuscated: string, key: string = 'LLUMINA_SECURE_2026'): string {
  const data = atob(obfuscated);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}
