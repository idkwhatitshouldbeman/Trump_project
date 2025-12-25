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

  const processLayout = (rawLayout) => {
    if (!rawLayout || !rawLayout.elements) return rawLayout

    const processed = {
      walls: [],
      entrances: [],
      exits: [],
      products: [],
      checkouts: [],
      ...rawLayout // Keep other props
    }

    rawLayout.elements.forEach(el => {
      if (el.type === 'wall' && el.points && el.points.length >= 2) {
        // Convert polyline to segments
        for (let i = 0; i < el.points.length - 1; i++) {
          processed.walls.push({
            start: el.points[i],
            end: el.points[i + 1]
          })
        }
      } else if (el.type === 'entrance') {
        processed.entrances.push(el)
        // Also track single entrance for simple access if needed
        processed.entrance = el
      } else if (el.type === 'exit') {
        processed.exits.push(el)
        processed.exit = el
      } else if (el.type === 'product') {
        processed.products.push({
          ...el,
          label: el.name // Ensure label field exists
        })
      } else if (el.type === 'checkout') {
        processed.checkouts.push(el)
      }
    })
    return processed
  }

  const handleStartSimulation = (layoutData) => {
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
            layout={layout || { elements: [] }}
            onLayoutChange={setLayout}
            onStartSimulation={handleStartSimulation}
          />
        )}
        {currentView === 'simulation' && layout && (
          <Simulation
            layout={processLayout(layout)}
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
