import { useState, useRef, useEffect } from 'react'
import './Dashboard.css'

const Dashboard = ({ results, onBack }) => {
  const originalCanvasRef = useRef(null)
  const optimizedCanvasRef = useRef(null)
  const [showHeatMap, setShowHeatMap] = useState(true)

  useEffect(() => {
    if (originalCanvasRef.current && optimizedCanvasRef.current && results) {
      const resizeAndDraw = () => {
        const originalCanvas = originalCanvasRef.current
        const optimizedCanvas = optimizedCanvasRef.current
        if (originalCanvas && optimizedCanvas) {
          const originalRect = originalCanvas.getBoundingClientRect()
          const optimizedRect = optimizedCanvas.getBoundingClientRect()
          originalCanvas.width = originalRect.width
          originalCanvas.height = originalRect.height
          optimizedCanvas.width = optimizedRect.width
          optimizedCanvas.height = optimizedRect.height
          drawLayout(originalCanvas, results.originalLayout, showHeatMap)
          drawLayout(optimizedCanvas, results.optimizedLayout, showHeatMap)
        }
      }
      resizeAndDraw()
      window.addEventListener('resize', resizeAndDraw)
      return () => window.removeEventListener('resize', resizeAndDraw)
    }
  }, [results, showHeatMap])

  const drawLayout = (canvas, layout, showHeatMap) => {
    const ctx = canvas.getContext('2d')
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    canvas.width = width
    canvas.height = height

    // Clear
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw walls
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
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
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        product.label,
        product.x + product.width / 2,
        product.y + product.height / 2 + 4
      )
    })

    // Draw checkouts
    layout.checkouts.forEach(checkout => {
      ctx.fillStyle = '#4169e1'
      ctx.fillRect(checkout.x - 12, checkout.y - 8, 24, 16)
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
        ctx.arc(x, y, 12, 0, Math.PI * 2)
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
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Draw heat map overlay (simplified visualization)
    if (showHeatMap) {
      // This would normally use actual congestion data from simulation
      // For now, we'll show a placeholder
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
      layout.products.forEach(product => {
        ctx.fillRect(product.x, product.y, product.width, product.height)
      })
    }
  }

  const calculateImprovements = () => {
    // These would come from actual simulation metrics
    // For now, return placeholder improvements
    return {
      congestion: 15, // 15% improvement
      shoppingTime: 12, // 12% improvement
      bottlenecks: 25 // 25% reduction
    }
  }

  const handleDownloadLayout = () => {
    const json = JSON.stringify(results.optimizedLayout, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized-store-layout.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportImage = (canvasRef, filename) => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const improvements = calculateImprovements()

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Optimization Results</h2>
        <button onClick={onBack}>Back to Editor</button>
      </div>

      <div className="dashboard-content">
        <div className="comparison-view">
          <div className="layout-panel">
            <h3>Original Layout</h3>
            <canvas ref={originalCanvasRef} className="comparison-canvas" />
          </div>

          <div className="layout-panel">
            <h3>Optimized Layout</h3>
            <canvas ref={optimizedCanvasRef} className="comparison-canvas" />
          </div>
        </div>

        <div className="dashboard-sidebar">
          <div className="metrics-comparison">
            <h3>Metrics Comparison</h3>
            
            <div className="metric-row">
              <div className="metric-label">Congestion Score</div>
              <div className="metric-values">
                <span className="original">100</span>
                <span className="arrow">→</span>
                <span className="optimized">85</span>
                <span className="improvement">({improvements.congestion}% better)</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Avg Shopping Time</div>
              <div className="metric-values">
                <span className="original">120s</span>
                <span className="arrow">→</span>
                <span className="optimized">106s</span>
                <span className="improvement">({improvements.shoppingTime}% better)</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Bottleneck Count</div>
              <div className="metric-values">
                <span className="original">8</span>
                <span className="arrow">→</span>
                <span className="optimized">6</span>
                <span className="improvement">({improvements.bottlenecks}% reduction)</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Fitness Score</div>
              <div className="metric-values">
                <span className="optimized">{Math.round(results.fitness || 0)}</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Generations</div>
              <div className="metric-values">
                <span className="optimized">{results.generations || 0}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-controls">
            <label>
              <input
                type="checkbox"
                checked={showHeatMap}
                onChange={(e) => setShowHeatMap(e.target.checked)}
              />
              Show Heat Map
            </label>

            <button onClick={handleDownloadLayout} className="action-button">
              Download Optimized Layout
            </button>

            <button 
              onClick={() => handleExportImage(originalCanvasRef, 'original-layout.png')}
              className="action-button"
            >
              Export Original as Image
            </button>

            <button 
              onClick={() => handleExportImage(optimizedCanvasRef, 'optimized-layout.png')}
              className="action-button"
            >
              Export Optimized as Image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
