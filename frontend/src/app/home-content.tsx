'use client'

import { SettingsPanel } from '@/components/settings/settings-panel'
import { DemoDataSection } from '@/components/demo/demo-data-section'
import { AgentChatPanel } from '@/features/agent-chat/agent-chat-panel'
import { useT } from '@/i18n'

export function HomeContent() {
  const t = useT()

  return (
    <main className="min-h-screen bg-base text-text-primary">
      <section className="mx-auto flex w-full max-w-5xl flex-col px-6 pt-12 pb-24">
        <p className="text-sm text-text-secondary">Agent Template</p>
        <h1 className="mt-3 text-xl font-display font-normal">
          {t('home.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
          {t('home.subtitle')}
        </p>
      </section>
      <DemoDataSection />
      <SettingsPanel />
      <AgentChatPanel />
    </main>
  )
}
