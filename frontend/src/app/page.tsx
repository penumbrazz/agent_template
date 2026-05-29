import { SettingsPanel } from '@/components/settings/settings-panel'
import { AuthGuard } from '@/features/auth/auth-guard'

export default function HomePage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-base text-text-primary">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
          <p className="text-sm text-text-secondary">Agent Template</p>
          <h1 className="mt-3 text-xl font-semibold">全栈 AI 应用模板</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
            工程底座已就绪。后续模块会在这里接入模型供应商、提示词模板、智能体配置和多智能体编排。
          </p>
        </section>
        <SettingsPanel />
      </main>
    </AuthGuard>
  )
}
