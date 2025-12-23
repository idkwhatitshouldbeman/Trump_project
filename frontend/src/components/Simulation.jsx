import { useState, useEffect, useRef } from 'react'
import { SimulationEngine } from '../utils/simulationEngine'
import { GeneticOptimizer } from '../utils/geneticOptimizer'
import './Simulation.css'

const Simulation = ({ layout, onOptimizationComplete, onBack }) => {
  const canvasRef = useRef(null)
  const [engine, setEngine] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showHeatMap, setShowHeatMap] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationProgress, setOptimizationProgress] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resizeCanvas()
    const ctx = canvas.getContext('2d')

    const simEngine = new SimulationEngine(layout, (state) => {
      setMetrics(state.metrics)
      resizeCanvas()
      const currentCtx = canvas.getContext('2d')
      drawSimulation(currentCtx, canvas.width, canvas.height, state, layout, showHeatMap)
    })

    setEngine(simEngine)
    drawLayout(ctx, canvas.width, canvas.height, layout)

    window.addEventListener('resize', resizeCanvas)
    return () => {
      simEngine.stop()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [layout])

  useEffect(() => {
    if (engine && metrics) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const customers = engine.customers || []
      drawSimulation(ctx, canvas.width, canvas.height, { customers, metrics }, layout, showHeatMap)
    }
  }, [metrics, showHeatMap, engine, layout])

  const drawLayout = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw walls
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 3
    layout.walls.forEach(wall => {
      ctx.beginPath()
      ctx.moveTo(wall.start.x, wall.start.y)
      ctx.lineTo(wall.end.x, wall.end.y)
      ctx.stroke()
    })

    // Draw product sections
    layout.products.forEach(product => {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)'
      ctx.strokeStyle = '#6495ed'
      ctx.lineWidth = 2
      ctx.fillRect(product.x, product.y, product.width, product.height)
      ctx.strokeRect(product.x, product.y, product.width, product.height)
      
      ctx.fillStyle = '#333'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        product.label,
        product.x + product.width / 2,
        product.y + product.height / 2 + 5
      )
    })

    // Draw checkouts
    layout.checkouts.forEach(checkout => {
      ctx.fillStyle = '#4169e1'
      ctx.fillRect(checkout.x - 15, checkout.y - 10, 30, 20)
    })

    // Draw entrances
    if (layout.entrances) {
      layout.entrances.forEach(entrance => {
        if (!entrance.wallIndex || !layout.walls[entrance.wallIndex]) return
        const wall = layout.walls[entrance.wallIndex]
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        const entranceLength = entrance.length || 40
        const centerOffset = entrance.offset + entranceLength / 2
        const x = wall.start.x + (dx / wallLength) * centerOffset
        const y = wall.start.y + (dy / wallLength) * centerOffset
        
        ctx.fillStyle = '#00ff00'
        ctx.beginPath()
        ctx.arc(x, y, 15, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Draw exits
    if (layout.exits) {
      layout.exits.forEach(exit => {
        if (!exit.wallIndex || !layout.walls[exit.wallIndex]) return
        const wall = layout.walls[exit.wallIndex]
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const wallLength = Math.sqrt(dx * dx + dy * dy)
        const exitLength = exit.length || 40
        const centerOffset = exit.offset + exitLength / 2
        const x = wall.start.x + (dx / wallLength) * centerOffset
        const y = wall.start.y + (dy / wallLength) * centerOffset
        
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(x, y, 15, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }

  const drawSimulation = (ctx, width, height, state, layout, showHeatMap) => {
    drawLayout(ctx, width, height)

    // Draw heat map
    if (showHeatMap && state.metrics) {
      const gridSize = 50
      const maxCongestion = Math.max(...Array.from(state.metrics.congestionData.values()), 1)
      
      for (const [key, count] of state.metrics.congestionData.entries()) {
        const [x, y] = key.split(',').map(Number)
        const intensity = count / maxCongestion
        const alpha = Math.min(0.6, intensity * 0.6)
        
        if (intensity > 0.3) {
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`
        } else {
          ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.5})`
        }
        
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize)
      }
    }

    // Draw customers
    if (state.customers) {
      state.customers.forEach(customer => {
        let color = '#ffd700' // yellow for shopping
        if (customer.status === 'checkout') color = '#ff8c00' // orange
        if (customer.status === 'exiting') color = '#00ff00' // green

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(customer.x, customer.y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    // Draw bottlenecks
    if (state.metrics && state.metrics.bottleneckLocations) {
      state.metrics.bottleneckLocations.forEach(bottleneck => {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
        ctx.beginPath()
        ctx.arc(bottleneck.x, bottleneck.y, 20, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }

  const handleStart = () => {
    if (engine) {
      engine.start()
      setIsRunning(true)
    }
  }

  const handlePause = () => {
    if (engine) {
      engine.pause()
      setIsRunning(false)
    }
  }

  const handleStop = () => {
    if (engine) {
      engine.stop()
      setIsRunning(false)
      setMetrics(null)
    }
  }

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed)
    if (engine) {
      engine.setSpeed(newSpeed)
    }
  }

  const handleRunOptimization = async () => {
    if (!layout) return

    setIsOptimizing(true)
    setOptimizationProgress({ generation: 0, bestFitness: 0 })

    const optimizer = new GeneticOptimizer(layout, (progress) => {
      setOptimizationProgress(progress)
    })

    try {
      const results = await optimizer.optimize(50)
      onOptimizationComplete(results)
    } catch (error) {
      console.error('Optimization error:', error)
      alert('Optimization failed. Please try again.')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="simulation">
      <div className="simulation-controls">
        <div className="control-group">
          <button onClick={handleStart} disabled={isRunning}>
            Start
          </button>
          <button onClick={handlePause} disabled={!isRunning}>
            Pause
          </button>
          <button onClick={handleStop}>Stop</button>
        </div>

        <div className="control-group">
          <label>Speed:</label>
          <select value={speed} onChange={(e) => handleSpeedChange(Number(e.target.value))}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showHeatMap}
              onChange={(e) => setShowHeatMap(e.target.checked)}
            />
            Heat Map
          </label>
        </div>

        <div className="control-group">
          <button 
            onClick={handleRunOptimization} 
            className="optimize-button"
            disabled={isOptimizing}
          >
            {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
          </button>
        </div>

        <div className="control-group">
          <button onClick={onBack}>Back to Editor</button>
        </div>
      </div>

      <div className="simulation-content">
        <canvas ref={canvasRef} className="simulation-canvas" />

        <div className="simulation-sidebar">
          <h3>Metrics</h3>
          
          {metrics ? (
            <div className="metrics">
              <div className="metric-item">
                <label>Simulation Time:</label>
                <span>{Math.round((metrics.time || 0) / 1000)}s</span>
              </div>
              <div className="metric-item">
                <label>Customers in Store:</label>
                <span>{metrics.currentCustomers || 0}</span>
              </div>
              <div className="metric-item">
                <label>Avg Congestion:</label>
                <span>{metrics.avgCongestion || 0}</span>
              </div>
              <div className="metric-item">
                <label>Bottlenecks:</label>
                <span>{metrics.bottleneckCount || 0}</span>
              </div>
              <div className="metric-item">
                <label>Avg Shopping Time:</label>
                <span>{metrics.avgShoppingTime || 0}s</span>
              </div>
              <div className="metric-item">
                <label>Completed:</label>
                <span>{metrics.completedCustomers || 0}</span>
              </div>
            </div>
          ) : (
            <p>Start simulation to see metrics</p>
          )}

          {isOptimizing && optimizationProgress && (
            <div className="optimization-progress">
              <h4>Optimization Progress</h4>
              <div className="progress-item">
                <label>Generation:</label>
                <span>{optimizationProgress.generation}</span>
              </div>
              <div className="progress-item">
                <label>Best Fitness:</label>
                <span>{Math.round(optimizationProgress.bestFitness)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Simulation
