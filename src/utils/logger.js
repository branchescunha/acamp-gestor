function getSanitizedError(error) {
  if (!error) return { message: 'Erro desconhecido.' }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  if (typeof error === 'object') {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
    }
  }

  return { message: String(error) }
}

export function logError(context, error) {
  if (!import.meta.env.DEV) return

  globalThis.console?.error?.(
    `[AcampGestor] ${context}`,
    getSanitizedError(error),
  )
}

export function getErrorForLog(error) {
  return getSanitizedError(error)
}
