/**
 * Cryptographic Utility Functions for GBKCRM Local Storage Security Hardening
 * 
 * Provides robust 256-bit AES-GCM encryption/decryption of local fields 
 * using pbkdf2 key derivation derived directly from the user's PIN code.
 */

const STABLE_SALT = new TextEncoder().encode("gbk-secured-pbkdf2-salt-2026");

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getCryptoKey(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(pin);
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: STABLE_SALT,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using a 256-bit AES-GCM key derived from a PIN.
 * Returns a base64 encoded format string containing the IV and Ciphertext: iv:ciphertext
 */
export async function encryptValue(plainText: string, pin: string): Promise<string> {
  if (!plainText) return "";
  const key = await getCryptoKey(pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(plainText);
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedText
  );
  
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
  
  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypts an encrypted string of the format iv:ciphertext using the derived PIN key.
 * Returns the plain string or null if decryption fails.
 */
export async function decryptValue(encryptedString: string, pin: string): Promise<string | null> {
  if (!encryptedString) return "";
  try {
    const parts = encryptedString.split(":");
    if (parts.length !== 2) return null;
    const [ivBase64, ciphertextBase64] = parts;
    
    const key = await getCryptoKey(pin);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}
