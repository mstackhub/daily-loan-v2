import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto relative bg-white">
      {/* Ambient glow background */}
      <div className="fixed inset-0 max-w-lg mx-auto pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <main className="relative z-10 pb-safe">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
