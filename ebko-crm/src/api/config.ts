const mockFlag = import.meta.env.VITE_USE_MOCK_DATA

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const USE_MOCK_DATA = mockFlag ? mockFlag !== 'false' : true

export const MOCK_NETWORK_DELAY_MS = Number(import.meta.env.VITE_MOCK_DELAY_MS ?? '220')

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
