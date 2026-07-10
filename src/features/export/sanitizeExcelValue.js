export function sanitizeExcelValue(value) {
  if (typeof value !== 'string') return value
  if (!/^\s*[=+\-@]/.test(value)) return value

  return `'${value}`
}

export function sanitizeExcelRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sanitizeExcelValue(value)]),
  )
}
