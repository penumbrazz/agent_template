'use client'

import { useState } from 'react'
import { LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/use-auth'
import { useT, translate } from '@/i18n'

export function AccountSettings() {
  const { user, logout } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const t = useT()

  if (!user) return null

  const handleLogout = async () => {
    try {
      setConfirmOpen(false)
      await logout()
    } catch {
      toast.error(translate('auth.logoutFailed'))
    }
  }

  return (
    <div className="space-y-6" data-testid="account-settings">
      <h3 className="text-base font-medium">{t('settings.account.title')}</h3>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t flex justify-end">
        <Button
          variant="outline"
          className="text-primary border-primary hover:bg-primary hover:text-on-primary"
          onClick={() => setConfirmOpen(true)}
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('auth.logout')}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('auth.logout')}</DialogTitle>
            <DialogDescription data-testid="logout-confirm-desc">
              {t('settings.account.logoutConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              data-testid="logout-cancel-button"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-primary hover:bg-primary-active text-on-primary"
              onClick={handleLogout}
              data-testid="logout-confirm-button"
            >
              {t('auth.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
