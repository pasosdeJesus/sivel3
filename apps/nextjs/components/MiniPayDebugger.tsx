'use client'

import { useEffect, useState } from 'react'
import { useMiniPay } from '@/hooks/useMiniPay'
import { useAccount } from 'wagmi'

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export function MiniPayDebugger() {
  const { isMiniPay, isConnecting, isConnected, phoneNumber, address } = useMiniPay()
  const { isConnected: wagmiConnected, address: wagmiAddress } = useAccount()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }])
  }

  useEffect(() => {
    if (!isMiniPay) return
    
    addLog('🔍 MiniPay detectado', 'success')
    setIsVisible(true)
  }, [isMiniPay])

  useEffect(() => {
    if (isMiniPay) {
      addLog(`🔄 isConnecting: ${isConnecting}`, 'info')
      addLog(`🔗 isConnected (hook): ${isConnected}`, 'info')
      addLog(`🔗 wagmiConnected: ${wagmiConnected}`, 'info')
      if (address) addLog(`📱 Address (hook): ${address}`, 'success')
      if (wagmiAddress) addLog(`📱 Address (wagmi): ${wagmiAddress}`, 'success')
      if (phoneNumber) addLog(`📞 Phone: ${phoneNumber}`, 'success')
    }
  }, [isMiniPay, isConnecting, isConnected, address, wagmiConnected, wagmiAddress, phoneNumber])

  if (!isVisible || !isMiniPay) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-black/90 text-white rounded-lg shadow-xl overflow-hidden">
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-mono font-bold">🐞 MiniPay Debug</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="h-80 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {logs.length === 0 && (
          <div className="text-gray-500">Esperando eventos...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`border-l-2 pl-2 ${
            log.type === 'error' ? 'border-red-500 text-red-400' :
            log.type === 'success' ? 'border-green-500 text-green-400' :
            log.type === 'warning' ? 'border-yellow-500 text-yellow-400' :
            'border-blue-500 text-blue-300'
          }`}>
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
      </div>
      <div className="p-2 bg-gray-800 text-center text-gray-500 text-[10px]">
        MiniPay Debugger - Los logs desaparecen al cerrar
      </div>
    </div>
  )
}