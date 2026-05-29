'use client'

import React, { createContext, useCallback, useEffect, useState } from 'react'

import apiClient, { setAccessToken } from '@/apis/client'

export interface AuthUser {
  id: string
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient
      .post<AuthUser>('/api/auth/refresh')
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        setUser(null)
        setAccessToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokenData = await apiClient.post<{
      access_token: string
      token_type: string
      expires_in: number
    }>('/api/auth/login', { username, password })
    setAccessToken(tokenData.access_token)
    const me = await apiClient.get<AuthUser>('/api/auth/me')
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await apiClient.post('/api/auth/logout')
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
