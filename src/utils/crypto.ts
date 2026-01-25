/**
 * Криптографический модуль для защиты чувствительных данных
 * Использует Web Crypto API (браузерный стандарт)
 * 
 * Функции:
 * - AES-256-GCM шифрование для PII и финансовых данных
 * - HMAC-SHA256 для проверки целостности
 * - Безопасная генерация ключей
 * - Защита от tampering
 */

// Тип зашифрованных данных
export interface EncryptedData {
  iv: string;              // Initialization Vector (base64)
  data: string;            // Зашифрованные данные (base64)
  hmac: string;            // HMAC подпись (base64)
  timestamp: number;       // Временная метка
  version: string;         // Версия формата
}

const CRYPTO_VERSION = '1.0';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits для GCM

/**
 * Получить или создать мастер-ключ шифрования
 * Ключ генерируется один раз и сохраняется в localStorage
 * ВАЖНО: В production это должно быть на сервере!
 */
const getMasterKey = async (): Promise<CryptoKey> => {
  const stored = localStorage.getItem('_crypto_master_key');
  
  if (stored) {
    try {
      const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('[Crypto] Error importing key:', error);
    }
  }
  
  // Генерируем новый ключ
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Сохраняем для последующего использования
  const exported = await crypto.subtle.exportKey('raw', key);
  const keyString = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem('_crypto_master_key', keyString);
  
  return key;
};

/**
 * Получить или создать HMAC ключ
 */
const getHMACKey = async (): Promise<CryptoKey> => {
  const stored = localStorage.getItem('_crypto_hmac_key');
  
  if (stored) {
    try {
      const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign', 'verify']
      );
    } catch (error) {
      console.error('[Crypto] Error importing HMAC key:', error);
    }
  }
  
  // Генерируем новый ключ
  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  
  // Сохраняем
  const exported = await crypto.subtle.exportKey('raw', key);
  const keyString = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem('_crypto_hmac_key', keyString);
  
  return key;
};

/**
 * Конвертация ArrayBuffer в base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Конвертация base64 в ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Шифрование данных с использованием AES-256-GCM
 * @param data - данные для шифрования (будут преобразованы в JSON)
 * @returns зашифрованный объект
 */
export const encryptData = async (data: any): Promise<EncryptedData> => {
  try {
    // Получаем ключи
    const key = await getMasterKey();
    const hmacKey = await getHMACKey();
    
    // Преобразуем данные в JSON
    const jsonData = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonData);
    
    // Генерируем случайный IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Шифруем
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      dataBuffer
    );
    
    // Конвертируем в base64
    const ivBase64 = arrayBufferToBase64(iv.buffer);
    const encryptedBase64 = arrayBufferToBase64(encrypted);
    
    // Создаем HMAC подпись (для проверки целостности)
    const signature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      encoder.encode(ivBase64 + encryptedBase64)
    );
    const hmacBase64 = arrayBufferToBase64(signature);
    
    return {
      iv: ivBase64,
      data: encryptedBase64,
      hmac: hmacBase64,
      timestamp: Date.now(),
      version: CRYPTO_VERSION
    };
    
  } catch (error) {
    console.error('[Crypto] Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Дешифрование данных
 * @param encryptedData - зашифрованный объект
 * @returns оригинальные данные
 */
export const decryptData = async (encryptedData: EncryptedData): Promise<any> => {
  try {
    // Получаем ключи
    const key = await getMasterKey();
    const hmacKey = await getHMACKey();
    
    // Проверяем версию
    if (encryptedData.version !== CRYPTO_VERSION) {
      console.warn('[Crypto] Version mismatch:', encryptedData.version);
    }
    
    // Проверяем HMAC (целостность данных)
    const encoder = new TextEncoder();
    const dataToVerify = encoder.encode(encryptedData.iv + encryptedData.data);
    const hmacBuffer = base64ToArrayBuffer(encryptedData.hmac);
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      hmacBuffer,
      dataToVerify
    );
    
    if (!isValid) {
      console.error('[Crypto] HMAC verification failed - data may be tampered');
      throw new Error('Data integrity check failed');
    }
    
    // Дешифруем
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const encrypted = base64ToArrayBuffer(encryptedData.data);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    // Конвертируем обратно в JSON
    const decoder = new TextDecoder();
    const jsonData = decoder.decode(decrypted);
    
    return JSON.parse(jsonData);
    
  } catch (error) {
    console.error('[Crypto] Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Генерация HMAC подписи для данных
 * @param data - данные для подписи
 * @returns HMAC подпись (base64)
 */
export const generateHMAC = async (data: string): Promise<string> => {
  try {
    const hmacKey = await getHMACKey();
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      encoder.encode(data)
    );
    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('[Crypto] HMAC generation error:', error);
    throw new Error('Failed to generate HMAC');
  }
};

/**
 * Проверка HMAC подписи
 * @param data - оригинальные данные
 * @param hmac - HMAC подпись для проверки
 * @returns true если подпись валидна
 */
export const verifyHMAC = async (data: string, hmac: string): Promise<boolean> => {
  try {
    const hmacKey = await getHMACKey();
    const encoder = new TextEncoder();
    const hmacBuffer = base64ToArrayBuffer(hmac);
    
    return await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      hmacBuffer,
      encoder.encode(data)
    );
  } catch (error) {
    console.error('[Crypto] HMAC verification error:', error);
    return false;
  }
};

/**
 * Хеширование пароля с использованием PBKDF2
 * @param password - пароль для хеширования
 * @param salt - соль (опционально, будет сгенерирована)
 * @returns объект с хешем и солью
 */
export const hashPassword = async (
  password: string, 
  salt?: string
): Promise<{ hash: string; salt: string }> => {
  try {
    const encoder = new TextEncoder();
    
    // Генерируем соль если не предоставлена
    const saltBuffer = salt 
      ? base64ToArrayBuffer(salt)
      : crypto.getRandomValues(new Uint8Array(16));
    
    // Импортируем пароль как ключ
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Используем PBKDF2 для хеширования
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000, // OWASP рекомендует минимум 100,000
        hash: 'SHA-256'
      },
      passwordKey,
      256
    );
    
    return {
      hash: arrayBufferToBase64(hashBuffer),
      salt: arrayBufferToBase64(saltBuffer)
    };
    
  } catch (error) {
    console.error('[Crypto] Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Проверка пароля против хеша
 * @param password - пароль для проверки
 * @param hash - сохраненный хеш
 * @param salt - соль
 * @returns true если пароль совпадает
 */
export const verifyPassword = async (
  password: string, 
  hash: string, 
  salt: string
): Promise<boolean> => {
  try {
    const result = await hashPassword(password, salt);
    return result.hash === hash;
  } catch (error) {
    console.error('[Crypto] Password verification error:', error);
    return false;
  }
};

/**
 * Очистка всех криптографических ключей
 * ВНИМАНИЕ: После этого невозможно будет расшифровать данные!
 */
export const clearCryptoKeys = (): void => {
  localStorage.removeItem('_crypto_master_key');
  localStorage.removeItem('_crypto_hmac_key');
  console.warn('[Crypto] All crypto keys have been cleared');
};

/**
 * Проверка доступности Web Crypto API
 */
export const isCryptoSupported = (): boolean => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined';
};

/**
 * Экспорт модуля
 */
export const CryptoModule = {
  encryptData,
  decryptData,
  generateHMAC,
  verifyHMAC,
  hashPassword,
  verifyPassword,
  clearCryptoKeys,
  isCryptoSupported
};

export default CryptoModule;
