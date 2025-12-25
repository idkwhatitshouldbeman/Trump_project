import { useState, useEffect, useRef } from 'react'
import { SimulationEngine } from '../utils/simulationEngine.js'
import { GeneticOptimizer } from '../utils/geneticOptimizer.js'
import './Simulation.css'

export default function Simulation({ layout, onOptimizationComplete, onBack }) {
  const canvasRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showHeatMap, setShowHeatMap] = useState(false)
  const [simulationData, setSimulationData] = useState(null)
  const [optimizationProgress, setOptimizationProgress] = useState(null)
  const engineRef = useRef(null)
  const optimizerRef = useRef(null)
  const animationFrameRef = useRef(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop()
      }
      if (optimizerRef.current) {
        optimizerRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (simulationData) {
      drawSimulation()
    }
  }, [simulationData, showHeatMap])

  const drawSimulation = () => {
    const canvas = canvasRef.current
    if (!canvas || !simulationData) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw layout
    drawLayout(ctx)

    // Draw heat map if enabled
    if (showHeatMap && simulationData.congestionMap) {
      drawHeatMap(ctx, simulationData.congestionMap)
    }

    // Draw customers
    simulationData.customers.forEach(customer => {
      drawCustomer(ctx, customer)
    })

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(() => {
      if (simulationData) {
        drawSimulation()
      }
    })
  }

  const drawLayout = (ctx) => {
    // Draw walls
    if (layout.walls && layout.walls.length > 0) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      layout.walls.forEach(wall => {
        ctx.beginPath()
        // Handle both formats: {start: {x,y}, end: {x,y}} or {x1, y1, x2, y2}
        const x1 = wall.start ? wall.start.x : wall.x1
        const y1 = wall.start ? wall.start.y : wall.y1
        const x2 = wall.end ? wall.end.x : wall.x2
        const y2 = wall.end ? wall.end.y : wall.y2
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })
    }

    // Draw product sections
    if (layout.products && layout.products.length > 0) {
      layout.products.forEach(section => {
        ctx.fillStyle = 'rgba(255, 243, 224, 0.5)'
        ctx.fillRect(section.x, section.y, section.width, section.height)
        ctx.strokeStyle = '#ff9800'
        ctx.lineWidth = 2
        ctx.strokeRect(section.x, section.y, section.width, section.height)
        
        ctx.fillStyle = '#333'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          section.label || section.name || 'Product',
          section.x + section.width / 2,
          section.y + section.height / 2 + 5
        )
      })
    }

    // Draw entrance
    if (layout.entrance) {
      ctx.fillStyle = '#4caf50'
      ctx.beginPath()
      ctx.arc(layout.entrance.x, layout.entrance.y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('IN', layout.entrance.x, layout.entrance.y + 4)
    }

    // Draw exit
    if (layout.exit) {
      ctx.fillStyle = '#f44336'
      ctx.beginPath()
      ctx.arc(layout.exit.x, layout.exit.y, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('OUT', layout.exit.x, layout.exit.y + 4)
    }

    // Draw checkouts
    if (layout.checkouts && layout.checkouts.length > 0) {
      layout.checkouts.forEach(checkout => {
        ctx.fillStyle = '#2196f3'
        ctx.fillRect(checkout.x - 20, checkout.y - 10, 40, 20)
        ctx.strokeStyle = '#1976d2'
        ctx.lineWidth = 2
        ctx.strokeRect(checkout.x - 20, checkout.y - 10, 40, 20)
        ctx.fillStyle = '#fff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Checkout', checkout.x, checkout.y + 4)
      })
    }
  }

  const drawHeatMap = (ctx, congestionMap) => {
    const gridSize = 20
    congestionMap.forEach((count, key) => {
      const [x, y] = key.split(',').map(Number)
      const intensity = Math.min(count / 5, 1) // Normalize to 0-1
      
      // Red for high congestion, green for low
      const r = Math.floor(intensity * 255)
      const g = Math.floor((1 - intensity) * 255)
      const b = 0
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`
      ctx.fillRect(x, y, gridSize, gridSize)
    })
  }

  const drawCustomer = (ctx, customer) => {
    // Color based on status
    let color = '#ffeb3b' // yellow - shopping
    if (customer.status === 'checkout') {
      color = '#ff9800' // orange
    } else if (customer.status === 'exiting') {
      color = '#4caf50' // green
    }

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(customer.x, customer.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const handleStart = () => {
    if (engineRef.current) {
      engineRef.current.stop()
    }

    const engine = new SimulationEngine(layout, (update) => {
      setSimulationData(update)
    }, apiKey)

    engine.setSpeed(speed)
    engine.start()
    engineRef.current = engine
    setIsRunning(true)
  }

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pause()
      setIsRunning(false)
    }
  }

  const handleStop = () => {
    if (engineRef.current) {
      engineRef.current.stop()
      setIsRunning(false)
      setSimulationData(null)
    }
  }

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed)
    if (engineRef.current) {
      engineRef.current.setSpeed(newSpeed)
    }
  }

  const handleRunOptimization = async () => {
    setIsOptimizing(true)
    setOptimizationProgress({ generation: 0, bestFitness: -Infinity })

    const optimizer = new GeneticOptimizer(layout, apiKey, (progress) => {
      setOptimizationProgress(progress)
      // Draw best layout if available
      if (progress.bestLayout) {
        // Update visualization with best layout
      }
    })

    optimizerRef.current = optimizer

    try {
      const results = await optimizer.optimize()
      
      // Run simulation on original layout for comparison
      const originalMetrics = await runEvaluationSimulation(layout)
      
      // Run simulation on optimized layout
      const optimizedMetrics = await runEvaluationSimulation(results.bestLayout)

      onOptimizationComplete({
        originalLayout: layout,
        optimizedLayout: results.bestLayout,
        originalMetrics,
        optimizedMetrics,
        bestFitness: results.bestFitness,
        generation: results.generation
      })
    } catch (error) {
      console.error('Optimization failed:', error)
      alert('Optimization failed. Check console for details.')
    } finally {
      setIsOptimizing(false)
      optimizerRef.current = null
    }
  }

  const runEvaluationSimulation = (layoutToTest) => {
    return new Promise((resolve) => {
      const maxTime = 300 // 5 minutes
      let metrics = null

      const engine = new SimulationEngine(layoutToTest, (update) => {
        if (update.time >= maxTime || update.metrics.completedCustomers >= 30) {
          engine.stop()
          metrics = update.metrics
          resolve(metrics)
        }
      }, apiKey)

      engine.start()

      // Safety timeout
      setTimeout(() => {
        engine.stop()
        if (!metrics) {
          metrics = engine.metrics
          resolve(metrics)
        }
      }, maxTime * 1000 + 10000)
    })
  }

  const metrics = simulationData?.metrics || {
    avgCongestion: 0,
    bottleneckCount: 0,
    avgShoppingTime: 0,
    totalCustomers: 0,
    completedCustomers: 0
  }

  return (
    <div className="simulation">
      <div className="simulation-controls">
        <button onClick={onBack} className="back-btn">← Back to Editor</button>
        <div className="controls-group">
          <button
            onClick={isRunning ? handlePause : handleStart}
            disabled={isOptimizing}
            className={isRunning ? 'pause-btn' : 'start-btn'}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button onClick={handleStop} disabled={isOptimizing} className="stop-btn">
            Stop
          </button>
        </div>
        <div className="controls-group">
          <label>Speed:</label>
          <select
            value={speed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            disabled={isOptimizing}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>
        <div className="controls-group">
          <label>
            <input
              type="checkbox"
              checked={showHeatMap}
              onChange={(e) => setShowHeatMap(e.target.checked)}
            />
            Heat Map
          </label>
        </div>
        <div className="controls-group">
          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing || isRunning}
            className="optimize-btn"
          >
            {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
          </button>
        </div>
      </div>

      <div className="simulation-content">
        <div className="simulation-canvas-container">
          <canvas
            ref={canvasRef}
            width={1000}
            height={800}
            className="simulation-canvas"
          />
          {isOptimizing && optimizationProgress && (
            <div className="optimization-overlay">
              <h3>Optimizing Layout...</h3>
              <p>Generation: {optimizationProgress.generation}</p>
              <p>Best Fitness: {optimizationProgress.bestFitness.toFixed(2)}</p>
              <button onClick={() => optimizerRef.current?.stop()}>Stop</button>
            </div>
          )}
        </div>

        <div className="simulation-metrics">
          <h3>Real-time Metrics</h3>
          <div className="metric">
            <label>Simulation Time:</label>
            <span>{simulationData?.time.toFixed(1) || 0}s</span>
          </div>
          <div className="metric">
            <label>Customers in Store:</label>
            <span>{simulationData?.customers.length || 0}</span>
          </div>
          <div className="metric">
            <label>Avg Congestion:</label>
            <span>{metrics.avgCongestion.toFixed(1)}</span>
          </div>
          <div className="metric">
            <label>Bottlenecks:</label>
            <span>{metrics.bottleneckCount}</span>
          </div>
          <div className="metric">
            <label>Avg Shopping Time:</label>
            <span>{metrics.avgShoppingTime.toFixed(1)}s</span>
          </div>
          <div className="metric">
            <label>Completed:</label>
            <span>{metrics.completedCustomers}/{metrics.totalCustomers}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
