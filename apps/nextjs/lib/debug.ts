// lib/debug.ts
// Utilidades para depuración

/**
 * Serializa un objeto de forma segura para logs
 * Maneja objetos circulares y valores no serializables
 */
export function safeStringify(obj: any, maxLength: number = 500): string {
  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'
  
  // Tipos primitivos
  if (typeof obj === 'string') return obj
  if (typeof obj === 'number') return obj.toString()
  if (typeof obj === 'boolean') return obj.toString()
  if (typeof obj === 'function') return '[Function]'
  
  // Error objects
  if (obj instanceof Error) {
    return `${obj.name}: ${obj.message}${obj.stack ? `\n${obj.stack}` : ''}`
  }
  
  // Objetos con toJSON
  if (typeof obj.toJSON === 'function') {
    try {
      return safeStringify(obj.toJSON(), maxLength)
    } catch (e) {
      return '[Circular or Invalid toJSON]'
    }
  }
  
  // Arrays y objetos
  try {
    const seen = new WeakSet()
    const serialized = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
      }
      return value
    }, 2)
    
    if (serialized.length > maxLength) {
      return serialized.substring(0, maxLength) + '... [truncated]'
    }
    return serialized
  } catch (err) {
    return `[Unable to serialize: ${err}]`
  }
}

/**
 * Imprime un objeto en consola con formato
 */
export function debugLog(label: string, data: any): void {
  console.log(`[DEBUG] ${label}:`, safeStringify(data))
}