import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ToastContext } from '../contexts/feedbackContexts'

const toastStyles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  info: 'border-zinc-700 bg-zinc-900 text-zinc-100',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((toastId) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    )
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    setToasts((currentToasts) => [
      ...currentToasts.slice(-2),
      { id, message, type },
    ])

    return id
  }, [])

  const value = useMemo(
    () => ({
      showToast,
      showSuccess: (message) => showToast(message, 'success'),
      showError: (message) => showToast(message, 'error'),
      showInfo: (message) => showToast(message, 'info'),
    }),
    [showToast],
  )

  useEffect(() => {
    if (!toasts.length) return undefined

    const timeoutIds = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 4500),
    )

    return () => {
      timeoutIds.forEach(window.clearTimeout)
    }
  }, [dismissToast, toasts])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm shadow-2xl shadow-black/30 backdrop-blur ${
              toastStyles[toast.type] || toastStyles.info
            }`}
          >
            <span className="leading-5">{toast.message}</span>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar aviso"
              className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
