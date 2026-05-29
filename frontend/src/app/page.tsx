import { AuthGuard } from '@/features/auth/auth-guard'
import { HomeContent } from './home-content'

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  )
}
