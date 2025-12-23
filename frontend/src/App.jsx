import { useState, useEffect } from 'react'
import Editor from './components/Editor'
import Simulation from './components/Simulation'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('editor') // 'editor' | 'simulation' | 'dashboard'
  const [layout, setLayout] = useState(null)
  const [optimizationResults, setOptimizationResults] = useState(null)

  // Load layout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('storeLayout')
    if (saved) {
      try {
        setLayout(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved layout:', e)
      }
    }
  }, [])

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    if (layout) {
      localStorage.setItem('storeLayout', JSON.stringify(layout))
    }
  }, [layout])

  const handleStartSimulation = (layoutData) => {
    setLayout(layoutData)
    setCurrentView('simulation')
  }

  const handleOptimizationComplete = (results) => {
    setOptimizationResults(results)
    setCurrentView('dashboard')
  }

  const handleBackToEditor = () => {
    setCurrentView('editor')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Store Layout Optimizer</h1>
        <nav>
          <button 
            onClick={() => setCurrentView('editor')}
            className={currentView === 'editor' ? 'active' : ''}
          >
            Editor
          </button>
          <button 
            onClick={() => setCurrentView('simulation')}
            className={currentView === 'simulation' ? 'active' : ''}
            disabled={!layout}
          >
            Simulation
          </button>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={currentView === 'dashboard' ? 'active' : ''}
            disabled={!optimizationResults}
          >
            Results
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'editor' && (
          <Editor 
            initialLayout={layout}
            onStartSimulation={handleStartSimulation}
          />
        )}
        {currentView === 'simulation' && layout && (
          <Simulation 
            layout={layout}
            onOptimizationComplete={handleOptimizationComplete}
            onBack={handleBackToEditor}
          />
        )}
        {currentView === 'dashboard' && optimizationResults && (
          <Dashboard 
            results={optimizationResults}
            onBack={handleBackToEditor}
          />
        )}
      </main>
    </div>
  )
}

export default App
