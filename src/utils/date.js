export function parseDateOnly(value) {
  if (!value || typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return date
}

export function formatDateOnly(value, fallback = '-') {
  const date = parseDateOnly(value)

  if (!date) return fallback

  return date.toLocaleDateString('pt-BR')
}

export function calculateAgeFromDateOnly(value, referenceDate = new Date()) {
  const birthDate = parseDateOnly(value)

  if (!birthDate) return ''

  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDifference = referenceDate.getMonth() - birthDate.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age--
  }

  return age
}
