export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function allowDevFallback(): boolean {
  return !isProduction()
}
