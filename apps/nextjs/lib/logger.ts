'use client'

// lib/logger.ts
// Sistema de logging unificado para SIVeL 3

type LogLevel = 'info' | 'success' | 'error' | 'warning' | 'debug'

interface LogEntry {
  timestamp: string
  message: string
  level: LogLevel
  source?: string
}

class Logger {
  private logs: LogEntry[] = []
  private listeners: ((logs: LogEntry[]) => void)[] = []
  private consoleEnabled: boolean = true // Siempre enviar a console.log
  private floatingConsoleEnabled: boolean = false // Consola flotante solo si variable=1
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Verificar si la consola flotante está activada
      this.floatingConsoleEnabled = process.env.NEXT_PUBLIC_M_DEBUGGER_CONSOLE === '1'
      if (this.floatingConsoleEnabled) {
        console.log('🐞 [Logger] Consola flotante activada (M_DEBUGGER_CONSOLE)')
      }
    }
  }
  
  private addLog(message: string, level: LogLevel, source?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
      source
    }
    
    this.logs.push(entry)
    
    // Limitar tamaño del buffer
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500)
    }
    
    // SIEMPRE enviar a console.log
    const prefix = `[${entry.timestamp}]${source ? ` [${source}]` : ''}`
    switch (level) {
      case 'error':
        console.error(prefix, message)
        break
      case 'warning':
        console.warn(prefix, message)
        break
      case 'success':
        console.log(`✅ ${prefix}`, message)
        break
      default:
        console.log(`📢 ${prefix}`, message)
    }
    
    // Notificar a los listeners (para la consola flotante)
    if (this.floatingConsoleEnabled) {
      this.listeners.forEach(listener => listener([...this.logs]))
    }
  }
  
  info(message: string, source?: string) {
    this.addLog(message, 'info', source)
  }
  
  success(message: string, source?: string) {
    this.addLog(message, 'success', source)
  }
  
  error(message: string, source?: string) {
    this.addLog(message, 'error', source)
  }
  
  warning(message: string, source?: string) {
    this.addLog(message, 'warning', source)
  }
  
  debug(message: string, source?: string) {
    if (process.env.NODE_ENV === 'development') {
      this.addLog(message, 'debug', source)
    }
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs]
  }
  
  clear() {
    this.logs = []
    if (this.floatingConsoleEnabled) {
      this.listeners.forEach(listener => listener([]))
    }
  }
  
  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
  
  isFloatingConsoleEnabled(): boolean {
    return this.floatingConsoleEnabled
  }
}

// Singleton
export const logger = new Logger()

// Hook para usar en componentes React
import { useState, useEffect } from 'react'
export function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  
  useEffect(() => {
    setLogs(logger.getLogs())
    setIsEnabled(logger.isFloatingConsoleEnabled())
    
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs)
    })
    
    return unsubscribe
  }, [])
  
  return { logs, logger, isEnabled }
}