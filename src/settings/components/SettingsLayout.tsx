import { type ReactNode } from 'react'

interface SettingsLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

function SettingsLayout({ sidebar, children }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar - 25% width */}
      <aside className="w-1/4 border-r border-gray-200 bg-gray-50">
        {sidebar}
      </aside>
      
      {/* Content Area - 75% width */}
      <main className="w-3/4 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default SettingsLayout
