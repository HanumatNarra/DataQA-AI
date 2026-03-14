'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  rank?: number
  similarity?: number
  content?: string
  filename: string
  chunkIndex?: number
  metadata?: any
  type?: string
  chunkType?: string
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchResults?: SearchResult[]
  isUser?: boolean
  isCountQuery?: boolean
  isListQuery?: boolean
}

export default function ChatInterface({ userId, initialInput = '' }: { userId: string; initialInput?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState(initialInput)
  const [isLoading, setIsLoading] = useState(false)
  const [conversationContext, setConversationContext] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Update input value when initialInput changes
  useEffect(() => {
    if (initialInput) {
      setInputValue(initialInput)
    }
  }, [initialInput])
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !userId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      isUser: true
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputValue,
          conversationContext: conversationContext,
          limit: 5
        })
      })

      if (!searchResponse.ok) {
        throw new Error('Search failed')
      }

      const response = await searchResponse.json()
        
      if (!response.success) {
        throw new Error(response.error || 'Search failed')
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date(),
        searchResults: [],
        isUser: false,
        isCountQuery: response.isCountQuery || false,
        isListQuery: response.isListQuery || false
      }

      if (response.conversationContext) {
        setConversationContext(response.conversationContext);
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "How many orders per status?",
    "Show revenue trends over time",
    "Which products are top sellers?",
    "Customer distribution by region"
  ]

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] shadow-sm p-6 h-full flex flex-col text-[var(--text)]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1 text-[var(--text)]">Chat with your Data</h2>
        <p className="text-sm text-[var(--text-muted)]">Ask questions in natural language</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-[var(--text)] mb-4">
              {"Hello! I'm your AI data analyst. Upload a file and ask me questions about your data in plain English. For example: 'How many orders per status?' or 'Show me revenue trends over time'"}
            </p>
            
            {/* Suggested Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text)]">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="px-4 py-2 bg-[var(--line)] text-[var(--text)] rounded-lg text-sm hover:bg-[var(--line)]/70 transition-colors min-h-[38px] flex items-center"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-4 py-3 rounded-xl ${
                message.isUser 
                  ? 'bg-[var(--primary)] text-white shadow-sm' 
                  : 'bg-[var(--line)] text-[var(--text)] shadow-sm'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] pt-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            className="flex-1 px-4 py-3 border border-[var(--line)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-transparent text-[var(--text)] placeholder-gray-500 bg-[var(--surface)]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-5 py-3 bg-[var(--primary)] text-white font-medium rounded-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
