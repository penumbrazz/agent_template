import { getApiBaseUrl } from '@/lib/runtime-config'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// In-memory access token (never persisted to localStorage)
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

let onAuthFailure: (() => void) | null = null

export function setOnAuthFailure(callback: (() => void) | null): void {
  onAuthFailure = callback
}

let refreshPromise: Promise<boolean> | null = null

class APIClient {
  private getBaseURL(): string {
    return getApiBaseUrl()
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const url = `${this.getBaseURL()}/api/auth/refresh`
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) return false
        const data = await response.json()
        accessToken = data.access_token
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseURL()}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers,
    }

    const response = await fetch(url, config)

    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`
        const retryConfig: RequestInit = {
          ...options,
          credentials: 'include',
          headers,
        }
        const retryResponse = await fetch(url, retryConfig)
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return null as T
          return retryResponse.json()
        }
        const errorText = await retryResponse.text()
        throw new ApiError(errorText, retryResponse.status)
      }
      accessToken = null
      onAuthFailure?.()
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(errorText, response.status)
    }

    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new APIClient()

export default apiClient
