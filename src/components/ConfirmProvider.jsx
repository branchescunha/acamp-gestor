import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmContext } from '../contexts/feedbackContexts'

const initialDialog = {
  title: '',
  description: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  destructive: true,
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const cancelButtonRef = useRef(null)
  const openerRef = useRef(null)
  const pendingResolveRef = useRef(null)

  const closeDialog = useCallback((result) => {
    const resolve = pendingResolveRef.current
    if (!resolve) return

    pendingResolveRef.current = null
    resolve(result)
    setDialog(null)

    window.setTimeout(() => openerRef.current?.focus?.(), 0)
  }, [])

  const confirm = useCallback((options) => {
    if (pendingResolveRef.current) {
      return Promise.resolve(false)
    }

    openerRef.current = document.activeElement

    return new Promise((resolve) => {
      pendingResolveRef.current = resolve
      setDialog({
        ...initialDialog,
        ...options,
      })
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  useEffect(() => {
    if (!dialog) return undefined

    cancelButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDialog, dialog])

  useEffect(() => {
    return () => {
      pendingResolveRef.current?.(false)
      pendingResolveRef.current = null
    }
  }, [])

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl shadow-black/40"
          >
            <h2 id="confirm-dialog-title" className="text-xl font-bold">
              {dialog.title}
            </h2>

            <p
              id="confirm-dialog-description"
              className="mt-3 text-sm leading-6 text-zinc-400"
            >
              {dialog.description}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                ref={cancelButtonRef}
                onClick={() => closeDialog(false)}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                {dialog.cancelLabel}
              </button>

              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  dialog.destructive
                    ? 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-yellow-500 text-zinc-950 hover:bg-yellow-400'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
