import { Outfit, Nunito } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata = {
  title: "Focus Coach | Caregiver Dashboard",
  description: "Manage routines and view progress for Focus Buddy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${nunito.variable} antialiased flex h-screen overflow-hidden`}>
        {/* Sidebar Navigation */}
        <nav className="w-64 glass-surface flex flex-col h-full z-10 hidden md:flex">
          <div className="p-6 pt-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg font-bold text-xl">
                C
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-lg text-text-main leading-tight">Focus Coach</h1>
                <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Caregiver</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 px-4 py-6 space-y-2">
            <NavLink href="/" label="Home" icon="🏠" />
            <NavLink href="/tasks" label="Tasks" icon="📋" />
            <NavLink href="/progress" label="Progress" icon="📈" />
            <NavLink href="/child" label="Child Profile" icon="👤" />
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
        
        {/* Mobile Tab Bar (simple version) */}
        <nav className="fixed bottom-0 left-0 right-0 glass-card rounded-none rounded-t-3xl md:hidden flex justify-around p-4 z-20 border-b-0 border-l-0 border-r-0">
          <NavLink href="/" label="Home" icon="🏠" mobile />
          <NavLink href="/tasks" label="Tasks" icon="📋" mobile />
          <NavLink href="/progress" label="Progress" icon="📈" mobile />
          <NavLink href="/child" label="Profile" icon="👤" mobile />
        </nav>
      </body>
    </html>
  );
}

function NavLink({ href, label, icon, mobile }) {
  return (
    <Link href={href} className={`flex ${mobile ? 'flex-col items-center gap-1' : 'items-center gap-4 px-4 py-3'} rounded-2xl hover:bg-primary-wash text-text-main transition-all group`}>
      <span className={mobile ? 'text-2xl' : 'text-xl group-hover:scale-110 transition-transform'}>{icon}</span>
      <span className={mobile ? 'text-xs font-bold' : 'font-heading font-bold text-lg'}>{label}</span>
    </Link>
  );
}
