'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/features/auth/use-auth'
import { useT, translate } from '@/i18n'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const t = useT()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(username, password)
      router.replace('/')
    } catch {
      toast.error(translate('auth.loginFailed'), {
        description: translate('auth.invalidCredentials'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-display-sm font-display font-normal leading-tight tracking-[-0.3px]">
          Agent Template
        </h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          {t('auth.loginToContinue')}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-lg border border-border bg-base p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                {t('auth.username')}
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
                placeholder={t('auth.usernamePlaceholder')}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                {t('auth.password')}
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
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>
          </div>
          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={submitting}
            className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('auth.loginLoading') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  )
}
