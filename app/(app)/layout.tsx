import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-36">
      {children}
      <BottomNav />
    </div>
  )
}
