'use client'

import { useState } from 'react'
import { useLogger } from '@/lib/logger'
import { Terminal, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

export function DebugConsole() {
  const { logs, logger, isEnabled } = useLogger()
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // Forzar actualización periódica para capturar logs
  useEffect(() => {
    if (!isEnabled) return
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1)
    }, 500)
    return () => clearInterval(interval)
  }, [isEnabled])
  
  // Refrescar logs periódicamente
  const currentLogs = isEnabled ? logger.getLogs() : logs

  // Si la consola flotante no está activada, no renderizar nada
  if (!isEnabled) {
    return null
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-2 rounded-full shadow-lg hover:bg-black transition-colors"
        title="Abrir consola de depuración"
      >
        <Terminal className="h-5 w-5" />
      </button>
    )
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'border-red-500 text-red-400'
      case 'success': return 'border-green-500 text-green-400'
      case 'warning': return 'border-yellow-500 text-yellow-400'
      default: return 'border-blue-500 text-blue-300'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'debug': return '🔍'
      default: return '📢'
    }
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-black/95 text-white rounded-lg shadow-xl overflow-hidden transition-all ${isMinimized ? 'w-80' : 'w-96'}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-mono font-bold flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Debug Console
          <span className="text-[10px] bg-green-700 px-1 rounded">ACTIVE</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => logger.clear()}
            className="text-gray-400 hover:text-yellow-400"
            title="Limpiar logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white"
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="h-80 overflow-y-auto p-3 space-y-1 font-mono text-xs">
          {currentLogs.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No logs yet. Acciones generarán mensajes aquí.
            </div>
          )}
          {currentLogs.map((log, i) => (
            <div key={log.id || i} className={`border-l-2 pl-2 ${getLevelColor(log.level)}`}>
              <span className="text-gray-500">[{log.timestamp}]</span>
              {log.source && <span className="text-gray-600 ml-1">[{log.source}]</span>}
              <span className="ml-1">{getLevelIcon(log.level)}</span>
              <span className="ml-1">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}