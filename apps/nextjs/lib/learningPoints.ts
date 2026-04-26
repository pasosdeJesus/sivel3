// lib/learningPoints.ts
// Cliente para la API de learn.tg (incremento de Learning Points)
//
// === Protocolo de Nonces ===
// La tabla site_nonces mantiene last_nonce para sivel.xyz. Cada solicitud
// a learn.tg debe usar un nonce estrictamente mayor al anterior:
//   1. getCurrentNonce(db) → last_nonce (ej. 5)
//   2. Enviar nonce = last_nonce + 1 (ej. 6)
//   3. Si learn.tg responde "Nonce out of order" + expectedNonce:
//      - Actualizar last_nonce = expectedNonce - 1
//      - Reintentar
//   4. Si éxito: updateNonce(db, nextNonce) → last_nonce = nonce enviado
//
// El new_nonce en la respuesta de learn.tg es el contador INDEPENDIENTE
// de learn.tg, NO debe usarse para actualizar el nonce de sivel.xyz.
//
// === Mensaje Firmado ===
// Formato: sivel.xyz:increment:{user_wallet}:{amount}:{nonce}:{timestamp}:{txHash}
// Firmado con EIP-191 (personal_sign) usando PRIVATE_KEY.
// learn.tg verifica la firma recuperando la dirección y comparándola con SIVEL_ADDRESS.
//
// === Documentación Completa ===
// Ver documentación de la API de learn.tg (privada) para más detalles.

import { privateKeyToAccount } from 'viem/accounts'

// Configuración desde variables de entorno
const LEARN_API_URL = process.env.LEARNTG_INCREMENT_API_URL || 'https://learn.tg/api/learning-points/increment'
const SITE_ADDRESS = process.env.LEARNTG_ADDRESS || '0x9F636E5653b649b44c9375E6E103600AE55aF979'
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`

if (!PRIVATE_KEY) {
  console.warn('⚠️ PRIVATE_KEY no está configurada. Learning Points no funcionarán.')
}

export interface LearningPointsResponse {
  success: boolean
  new_learningscore?: number
  new_nonce?: number
  signature?: string
  error?: string
  currentScore?: number
  expectedNonce?: number
}

export interface LearningPointsResult {
  success: boolean
  message: string
  userMessage: string
  newScore?: number
}

/**
 * Obtiene el nonce actual desde la base de datos
 */
export async function getCurrentNonce(db: any): Promise<number> {
  const result = await db
    .selectFrom('site_nonces')
    .select('last_nonce')
    .where('site', '=', 'sivel.xyz')
    .executeTakeFirst()
  
  return result?.last_nonce ?? 0
}

/**
 * Actualiza el nonce en la base de datos
 */
export async function updateNonce(db: any, nonce: number): Promise<void> {
  await db
    .updateTable('site_nonces')
    .set({ 
      last_nonce: nonce,
      updated_at: new Date()
    })
    .where('site', '=', 'sivel.xyz')
    .execute()
}

/**
 * Construye el mensaje a firmar
 * Formato: sivel.xyz:increment:{user_wallet}:{amount}:{nonce}:{timestamp}:{txHash}
 */
export function buildMessage(
  userWallet: string,
  amount: number,
  nonce: number,
  timestamp: number,
  txHash: string
): string {
  return `sivel.xyz:increment:${userWallet}:${amount}:${nonce}:${timestamp}:${txHash}`
}

/**
 * Firma el mensaje usando la clave privada de sivel.xyz
 */
async function signMessage(message: string): Promise<string> {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY no configurada')
  }
  
  const account = privateKeyToAccount(PRIVATE_KEY)
  const signature = await account.signMessage({ message })
  return signature
}

/**
 * Llama a la API de learn.tg para incrementar Learning Points
 */
export async function incrementLearningPoints(
  db: any,
  userWallet: string,
  txHash: string,
  amount: number = 1,
  retryCount: number = 0
): Promise<LearningPointsResult> {
  const maxRetries = 3
  
  try {
    const nonce = await getCurrentNonce(db)
    const nextNonce = nonce + 1
    const timestamp = Date.now()
    
    const message = buildMessage(userWallet, amount, nextNonce, timestamp, txHash)
    console.log(`🔍 [LearningPoints] Mensaje a firmar: ${message}`)
    
    const signature = await signMessage(message)
    console.log(`🔍 [LearningPoints] Firma: ${signature.substring(0, 30)}...`)
    
    const response = await fetch(LEARN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_wallet: userWallet,
        amount,
        nonce: nextNonce,
        timestamp,
        signature,
        txHash,
      }),
    })
    
    const data: LearningPointsResponse = await response.json()
    
    if (response.ok && data.success) {
      await updateNonce(db, nextNonce)
      console.log(`✅ [LearningPoints] Nonce actualizado a ${nextNonce}`)
      return {
        success: true,
        message: `Learning Points incrementados. Nuevo score: ${data.new_learningscore}`,
        userMessage: `🎓 Your Learning Score is now ${data.new_learningscore}`,
        newScore: data.new_learningscore
      }
    }
    
    // Los errores 4xx de learn.tg no se reintentan (error del cliente)
    // Excepción: "Nonce out of order" es recuperable (re-sincronizar nonce y reintentar)
    if (data.error === 'Nonce out of order' && data.expectedNonce) {
      console.log(`🔄 [LearningPoints] Nonce out of order. Esperado: ${data.expectedNonce}`)
      await updateNonce(db, data.expectedNonce - 1)
      return incrementLearningPoints(db, userWallet, txHash, amount, retryCount + 1)
    }
    if (response.status >= 400 && response.status < 500) {
      console.log(`⚠️ [LearningPoints] Error 4xx de learn.tg: ${response.status}`)
      // Extraer userMessage según el error específico
      let userMsg: string
      if (data.error?.toLowerCase().includes('not found') || data.error?.toLowerCase().includes('no encontrado')) {
        userMsg = '⚠️ Your wallet is not registered in learn.tg. Create an account first to earn Learning Points.'
      } else if (data.error === 'Profile score too low') {
        return {
          success: false,
          message: `Profile score too low: ${data.currentScore} (needs >= 50)`,
          userMessage: '⚠️ You need to complete your profile first to earn Learning Points.'
        }
      } else if (data.error === 'Insufficient balance') {
        return {
          success: false,
          message: 'Campaign balance exhausted',
          userMessage: '⚠️ Campaign balance exhausted. Try again later.'
        }
      } else {
        userMsg = data.error
          ? `⚠️ learn.tg: ${data.error}`
          : '❌ Unable to update Learning Points. Contact the team.'
      }
      return { success: false, message: data.error || 'Client error', userMessage: userMsg }
    }

    // Reintentos para errores transitorios (5xx o de red)
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`🔄 [LearningPoints] Reintentando en ${delay}ms (intento ${retryCount + 1}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return incrementLearningPoints(db, userWallet, txHash, amount, retryCount + 1)
    }
    
    return {
      success: false,
      message: `API error: ${data.error || 'Unknown error'}`,
      userMessage: '❌ Unable to update Learning Points. Please try again later.'
    }
    
  } catch (error: any) {
    console.error('❌ [LearningPoints] Error:', error)
    
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`🔄 [LearningPoints] Error de red, reintentando en ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return incrementLearningPoints(db, userWallet, txHash, amount, retryCount + 1)
    }
    
    return {
      success: false,
      message: error.message || 'Network error',
      userMessage: '❌ Unable to update Learning Points. Please try again later.'
    }
  }
}