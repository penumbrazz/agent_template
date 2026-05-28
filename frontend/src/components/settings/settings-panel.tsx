'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { GeneralSettings } from './general-settings'
import { ModelConfig } from './model-config'

type Tab = 'general' | 'models'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('models')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="settings-trigger"
          className="fixed right-4 top-4 z-50"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[700px] sm:max-w-[700px] p-0" data-testid="settings-panel">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>设置</SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100vh-73px)]">
          <nav className="w-40 border-r p-4 flex flex-col gap-1">
            <button
              data-testid="tab-general"
              onClick={() => setActiveTab('general')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'general'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              通用设置
            </button>
            <button
              data-testid="tab-models"
              onClick={() => setActiveTab('models')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'models'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              模型配置
            </button>
          </nav>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelConfig />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
