import BottomNav from '@/components/BottomNav'
import { BuffetProvider } from '@/lib/buffetContext'
import BuffetSession from '@/components/BuffetSession'
import BuffetMiniBar from '@/components/BuffetMiniBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BuffetProvider>
      <div className="app-shell min-h-screen">
        {children}
        <BottomNav />
        {/* Rendered at layout level so they survive route changes and sit above BottomNav */}
        <BuffetMiniBar />
        <BuffetSession />
      </div>
    </BuffetProvider>
  )
}
