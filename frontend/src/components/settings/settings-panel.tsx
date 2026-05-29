'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GeneralSettings } from './general-settings'
import { ModelConfig } from './model-config'
import { AccountSettings } from './account-settings'

type Tab = 'general' | 'models' | 'account'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('models')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="settings-trigger"
          className="fixed right-4 top-4 z-50"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex flex-col max-w-[700px] w-[700px] gap-0 p-0 h-[80vh] rounded-xl"
        data-testid="settings-panel"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className="w-40 border-r p-4 flex flex-col gap-1 bg-[#efe9de]">
            <button
              data-testid="tab-account"
              onClick={() => setActiveTab('account')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'account'
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[#6b6560] hover:bg-[#e6dfd8]'
              }`}
            >
              账户
            </button>
            <button
              data-testid="tab-general"
              onClick={() => setActiveTab('general')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'general'
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[#6b6560] hover:bg-[#e6dfd8]'
              }`}
            >
              通用设置
            </button>
            <button
              data-testid="tab-models"
              onClick={() => setActiveTab('models')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'models'
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[#6b6560] hover:bg-[#e6dfd8]'
              }`}
            >
              模型配置
            </button>
          </nav>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelConfig />}
            {activeTab === 'account' && <AccountSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
