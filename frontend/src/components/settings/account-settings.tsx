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

export function AccountSettings() {
  const { user, logout } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    try {
      setConfirmOpen(false)
      await logout()
    } catch {
      toast.error('退出登录失败，请重试')
    }
  }

  return (
    <div className="space-y-6" data-testid="account-settings">
      <h3 className="text-base font-medium">账户信息</h3>
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#cc785c] text-white">
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
          className="text-[#cc785c] border-[#cc785c] hover:bg-[#cc785c] hover:text-white"
          onClick={() => setConfirmOpen(true)}
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>退出登录</DialogTitle>
            <DialogDescription>确定要退出登录吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              data-testid="logout-cancel-button"
            >
              取消
            </Button>
            <Button
              className="bg-[#cc785c] hover:bg-[#b56a4f] text-white"
              onClick={handleLogout}
              data-testid="logout-confirm-button"
            >
              退出登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
