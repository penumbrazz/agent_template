'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/features/auth/use-auth'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    router.replace('/')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(username, password)
      router.replace('/')
    } catch {
      toast.error('登录失败', { description: '用户名或密码错误' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <h1
          className="text-center text-[28px] font-normal leading-tight tracking-[-0.3px]"
          style={{ fontFamily: 'Cormorant Garamond, Tiempos Headline, serif' }}
        >
          Agent Template
        </h1>
        <p className="mt-2 text-center text-sm text-text-muted">登录以继续</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-border bg-base p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-10 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="请输入密码"
              />
            </div>
          </div>
          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={submitting}
            className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
