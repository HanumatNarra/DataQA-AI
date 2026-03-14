'use client'
import { useState } from 'react'
import { 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/tokens'
import FileUpload from './FileUpload'
import Sidebar from './Sidebar'
import ChatInterface from './ChatInterface'
import PlotPanel from './PlotPanel'
import ThemeToggle from './ui/ThemeToggle'
import RecentCharts from './charts/RecentCharts'
import { RecentFiles } from './files/RecentFiles'

type View = 'dashboard' | 'uploads' | 'chartsHistory'

export default function Dashboard() {
  const { user, profile, signOut, loading, signingOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'charts'>('chat')
  const [view, setView] = useState<View>('dashboard')
  const [chatInput, setChatInput] = useState('')
  // Chart loading is now handled by the RecentCharts component

  const handleAnalyze = (fileName: string) => {
    setChatInput(`Use ${fileName}. Show basic stats per column and any anomalies.`)
    setView('dashboard')
    setActiveTab('chat')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null; // This should not happen as the app should redirect to login
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-[var(--text)]">
                  DataQA.ai
                </span>
              </div>
              
              {/* Removed Chat/Charts from header per design */}
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Welcome back, {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={async () => {
                  if (signingOut) return; // Prevent multiple clicks
                  try {
                    // Only call client-side signOut - it handles both client and server cleanup
                    await signOut()
                    // Redirect after successful sign-out
                    window.location.replace('/sign-in')
                  } catch (err) {
                    console.warn('[Header] sign-out failed', err)
                    // Even if sign-out fails, redirect to ensure user gets to login
                    window.location.replace('/sign-in')
                  }
                }}
                disabled={signingOut}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm hover:bg-[color:rgb(255_255_255/0.02)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(37_99_235/0.35)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  borderColor: 'var(--line)'
                }}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Navigation Pane */}
          <div className="lg:col-span-1 space-y-6">
            <Sidebar active={view} onSelect={setView} />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-4">
            {view === 'dashboard' && (
              <div className="space-y-4">
                {/* Local tabs for Chat/Charts */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${activeTab === 'chat' ? 'bg-[var(--primary)] text-white' : ''}`}
                    style={activeTab === 'chat' ? {} : { background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--text)' }}
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4"/>
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('charts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${activeTab === 'charts' ? 'bg-[var(--primary)] text-white' : ''}`}
                    style={activeTab === 'charts' ? {} : { background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--text)' }}
                  >
                    <ChartBarIcon className="w-4 h-4"/>
                    Charts
                  </button>
                </div>

                {activeTab === 'chat' ? (
                  <ChatInterface userId={user.id} initialInput={chatInput} />
                ) : (
                  <PlotPanel />
                )}
              </div>
            )}

            {view === 'uploads' && (
              <div className="space-y-6">
                <div className="rounded-2xl border p-6 shadow-sm" style={{ background: colors.surface, borderColor: colors.line, color: colors.text }}>
                  <h2 className="text-lg font-semibold mb-4">Upload New File</h2>
                  <FileUpload userId={user.id} />
                </div>
              </div>
            )}

            {view === 'chartsHistory' && (
              <div className="rounded-2xl border p-6 shadow-sm" style={{ background: colors.surface, borderColor: colors.line, color: colors.text }}>
                <RecentCharts 
                  showTitle={false}
                  limit={12}
                  className=""
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
