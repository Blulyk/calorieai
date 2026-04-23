import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-secondary pb-24">
      {children}
      <BottomNav />
    </div>
  )
}
