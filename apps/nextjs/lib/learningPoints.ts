// lib/learningPoints.ts
// Cliente para la API de learn.tg (incremento de Learning Points)

import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http } from 'viem'
import { celo, celoSepolia } from 'viem/chains'

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

/**
 * Obtiene el nonce actual desde la base de datos
 * @param db Instancia de Kysely
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
 * Actualiza el nonce en la base de datos después de una solicitud exitosa
 * @param db Instancia de Kysely
 * @param nonce Nuevo nonce
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
 * Construye el mensaje a firmar según el formato de learn.tg
 * Formato: {SITE_ADDRESS}:increment:{user_wallet}:{amount}:{nonce}:{timestamp}:{txHash}
 */
function buildMessage(
  userWallet: string,
  amount: number,
  nonce: number,
  timestamp: number,
  txHash: string
): string {
  return `${SITE_ADDRESS}:increment:${userWallet}:${amount}:${nonce}:${timestamp}:${txHash}`
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
 * @param db Instancia de Kysely
 * @param userWallet Dirección del usuario que donó
 * @param amount Cantidad de puntos (siempre 1)
 * @param retryCount Número de reintentos (para recursión)
 */
export async function incrementLearningPoints(
  db: any,
  userWallet: string,
  txHash: string,
  amount: number = 1,
  retryCount: number = 0
): Promise<{ success: boolean; message: string; userMessage: string }> {
  const maxRetries = 3
  
  try {
    // Obtener nonce actual
    const nonce = await getCurrentNonce(db)
    const nextNonce = nonce + 1
    const timestamp = Date.now()
    
    // Construir mensaje y firmar (incluyendo txHash)
    const message = buildMessage(userWallet, amount, nextNonce, timestamp, txHash)
    console.log(`🔍 [LearningPoints] Mensaje a firmar: ${message}`)
    
    const signature = await signMessage(message)
    console.log(`🔍 [LearningPoints] Firma: ${signature.substring(0, 30)}...`)
    
    // Llamar a la API incluyendo txHash
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
      // Éxito: actualizar nonce en DB
      if (data.new_nonce) {
        await updateNonce(db, data.new_nonce)
        console.log(`✅ [LearningPoints] Nonce actualizado a ${data.new_nonce}`)
      }
      return {
        success: true,
        message: `Learning Points incrementados. Nuevo score: ${data.new_learningscore}`,
        userMessage: '🎓 Learning Points updated!'
      }
    }
    
    // Manejo de errores según la API
    if (data.error === 'Nonce out of order' && data.expectedNonce) {
      // Reintentar con el nonce esperado
      console.log(`🔄 [LearningPoints] Nonce out of order. Esperado: ${data.expectedNonce}, actualizando...`)
      await updateNonce(db, data.expectedNonce - 1)
      return incrementLearningPoints(db, userWallet, txHash, amount, retryCount + 1)
    }
    
    if (data.error === 'Profile score too low') {
      return {
        success: false,
        message: `Profile score too low: ${data.currentScore} (needs >= 50)`,
        userMessage: '⚠️ You need to complete your profile first to earn Learning Points.'
      }
    }
    
    if (data.error === 'Insufficient balance') {
      return {
        success: false,
        message: 'Campaign balance exhausted',
        userMessage: '⚠️ Campaign balance exhausted. Try again later.'
      }
    }
    
    // Otros errores (posiblemente transitorios)
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
    
    // Errores de red/timeout - reintentar
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