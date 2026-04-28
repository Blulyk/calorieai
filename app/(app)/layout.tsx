import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      {children}
      <BottomNav />
    </div>
  )
}
