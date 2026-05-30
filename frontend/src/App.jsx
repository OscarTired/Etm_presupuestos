import { useState, useEffect } from 'react'
import GabineteCalculator from './components/GabineteCalculator'
import TableroCalculator from './components/TableroCalculator'

function App() {
  const [tab, setTab] = useState('gabinetes') // 'gabinetes' or 'tableros'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern w-full font-sans text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <header className="bg-white dark:bg-black border-b border-gray-300 dark:border-gray-800 z-10 relative">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-[#286caf] dark:bg-[#faba33]"></div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-gray-900 dark:text-white uppercase">
              ETM <span className="text-[#286caf] dark:text-[#faba33] font-light hidden sm:inline">Sistema de Presupuestos</span>
            </h1>
          </div>

          {/* Selector de Módulo (Tabs) */}
          <div className="flex items-center border border-gray-300 dark:border-gray-800 p-0.5 bg-gray-50 dark:bg-[#111]">
            <button
              onClick={() => setTab('gabinetes')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === 'gabinetes'
                  ? 'bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              Gabinete Metálico
            </button>
            <button
              onClick={() => setTab('tableros')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === 'tableros'
                  ? 'bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              }`}
            >
              Tableros (Equipamiento ABB)
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Toggle Tema Claro/Oscuro */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 bg-transparent border border-gray-300 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 ease-out flex items-center justify-center text-gray-600 dark:text-gray-300"
              title={darkMode ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
            >
              {darkMode ? (
                // Icono de Sol
                <svg className="w-4 h-4 text-[#faba33] animate-in fade-in duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                // Icono de Luna
                <svg className="w-4 h-4 text-[#286caf] animate-in fade-in duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="font-mono text-[10px] md:text-xs text-gray-500 dark:text-gray-400 hidden md:block">
              v1.2.0 // ENGINE: OCTA_DEV
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 md:p-6 relative z-0">
        {tab === 'gabinetes' ? (
          <GabineteCalculator />
        ) : (
          <TableroCalculator />
        )}
      </main>
    </div>
  )
}

export default App

