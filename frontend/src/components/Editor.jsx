import { useState, useRef, useEffect } from 'react'
import './Editor.css'

const Editor = ({ initialLayout, onStartSimulation }) => {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('wall') // 'wall', 'entrance', 'exit', 'checkout', 'product'
  const [layout, setLayout] = useState(initialLayout || {
    walls: [],
    entrances: [],
    exits: [],
    checkouts: [],
    products: []
  })
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentWall, setCurrentWall] = useState(null)
  const [draggingProduct, setDraggingProduct] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [gridScale, setGridScale] = useState(20) // Grid scale in pixels
  const [snapToGrid, setSnapToGrid] = useState(true) // Enable/disable snap to grid
  const [unitSystem, setUnitSystem] = useState('feet') // 'feet', 'yards', 'meters'
  const [pixelsPerUnit, setPixelsPerUnit] = useState(10) // Scale: pixels per unit (e.g., 10 pixels = 1 foot)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      const ctx = canvas.getContext('2d')
      drawLayout(ctx, canvas.width, canvas.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [layout, gridScale, snapToGrid, unitSystem, pixelsPerUnit])

  // Handle ESC key to cancel current wall drawing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing && tool === 'wall') {
        setIsDrawing(false)
        setCurrentWall(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing, tool])

  // Snap coordinates to grid
  const snapToGridPoint = (x, y) => {
    if (!snapToGrid) return { x, y }
    const snappedX = Math.round(x / gridScale) * gridScale
    const snappedY = Math.round(y / gridScale) * gridScale
    return { x: snappedX, y: snappedY }
  }

  // Calculate distance from point to line segment
  const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
    const A = px - x1
    const B = py - y1
    const C = x2 - x1
    const D = y2 - y1
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    if (lenSq !== 0) param = dot / lenSq
    
    let xx, yy
    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }
    
    const dx = px - xx
    const dy = py - yy
    return { distance: Math.sqrt(dx * dx + dy * dy), point: { x: xx, y: yy }, param }
  }

  // Find nearest wall to a point
  const findNearestWall = (x, y) => {
    if (layout.walls.length === 0) return null
    
    let minDist = Infinity
    let nearestWall = null
    let nearestPoint = null
    let nearestParam = 0
    
    layout.walls.forEach((wall, idx) => {
      const result = pointToLineDistance(x, y, wall.start.x, wall.start.y, wall.end.x, wall.end.y)
      if (result.distance < minDist) {
        minDist = result.distance
        nearestWall = { ...wall, index: idx }
        nearestPoint = result.point
        nearestParam = result.param
      }
    })
    
    // Only return if within reasonable snapping distance (30px)
    if (minDist < 30) {
      return { wall: nearestWall, point: nearestPoint, param: nearestParam }
    }
    return null
  }

  // Calculate wall length
  const getWallLength = (wall) => {
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Convert pixels to real-world units
  const pixelsToUnits = (pixels) => {
    return pixels / pixelsPerUnit
  }

  // Format unit with appropriate abbreviation
  const formatUnit = (value) => {
    const unitValue = pixelsToUnits(value)
    let unitAbbr = ''
    if (unitSystem === 'feet') {
      unitAbbr = 'ft'
    } else if (unitSystem === 'yards') {
      unitAbbr = 'yd'
    } else if (unitSystem === 'meters') {
      unitAbbr = 'm'
    }
    
    // Round to 1 decimal place for display
    return unitValue.toFixed(1) + ' ' + unitAbbr
  }

  // Draw dimension line for a wall (Onshape style)
  const drawWallDimension = (ctx, wall, wallIndex) => {
    const length = getWallLength(wall)
    const midX = (wall.start.x + wall.end.x) / 2
    const midY = (wall.start.y + wall.end.y) / 2
    
    // Calculate wall angle
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const angle = Math.atan2(dy, dx)
    const perpAngle = angle + Math.PI / 2
    
    // Dynamic offset based on wall length to avoid compression
    // Longer walls get more offset, but cap at reasonable max
    const baseOffset = 35
    const lengthFactor = Math.min(length / 200, 1) // Scale up to 200px
    const offset = baseOffset + (lengthFactor * 20) // Range: 35-55px
    
    // Calculate dimension line position
    const dimStartX = wall.start.x + Math.cos(perpAngle) * offset
    const dimStartY = wall.start.y + Math.sin(perpAngle) * offset
    const dimEndX = wall.end.x + Math.cos(perpAngle) * offset
    const dimEndY = wall.end.y + Math.sin(perpAngle) * offset
    
    // Draw dimension line (dark gray)
    ctx.strokeStyle = '#333333'
    ctx.fillStyle = '#333333'
    ctx.lineWidth = 2
    
    // Calculate text dimensions first to determine gap
    const text = formatUnit(length)
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const textMetrics = ctx.measureText(text)
    const textWidth = textMetrics.width
    const padding = 4
    const textGap = textWidth + padding * 2
    
    // Text position
    const textX = midX + Math.cos(perpAngle) * offset
    const textY = midY + Math.sin(perpAngle) * offset
    
    // Draw dimension line with gap for text (two segments)
    const gapStartX = textX - textGap / 2
    const gapStartY = textY
    const gapEndX = textX + textGap / 2
    const gapEndY = textY
    
    // Left segment of dimension line
    ctx.beginPath()
    ctx.moveTo(dimStartX, dimStartY)
    ctx.lineTo(gapStartX, gapStartY)
    ctx.stroke()
    
    // Right segment of dimension line
    ctx.beginPath()
    ctx.moveTo(gapEndX, gapEndY)
    ctx.lineTo(dimEndX, dimEndY)
    ctx.stroke()
    
    // Extension line lengths: shorter on wall side, longer on dimension line side
    // Both extension lines at each end should be the same size
    const extensionLengthShort = 6  // Short line on wall side
    const extensionLengthLong = 12  // Long line on dimension line side
    
    // Use perpAngle (perpendicular to wall, which is same as perpendicular to dimension line)
    // since dimension line is parallel to wall
    
    // Perpendicular extension lines at start
    // Short line: from wall.start extending towards dimension line
    const extStartWallX1 = wall.start.x
    const extStartWallY1 = wall.start.y
    const extStartWallX2 = wall.start.x + Math.cos(perpAngle) * extensionLengthShort
    const extStartWallY2 = wall.start.y + Math.sin(perpAngle) * extensionLengthShort
    
    ctx.beginPath()
    ctx.moveTo(extStartWallX1, extStartWallY1)
    ctx.lineTo(extStartWallX2, extStartWallY2)
    ctx.stroke()
    
    // Long line: centered on dimStart, extending both ways (perpendicular to dimension line)
    const extStartDimX1 = dimStartX - Math.cos(perpAngle) * extensionLengthLong
    const extStartDimY1 = dimStartY - Math.sin(perpAngle) * extensionLengthLong
    const extStartDimX2 = dimStartX + Math.cos(perpAngle) * extensionLengthLong
    const extStartDimY2 = dimStartY + Math.sin(perpAngle) * extensionLengthLong
    
    ctx.beginPath()
    ctx.moveTo(extStartDimX1, extStartDimY1)
    ctx.lineTo(extStartDimX2, extStartDimY2)
    ctx.stroke()
    
    // Perpendicular extension lines at end
    // Short line: from wall.end extending towards dimension line
    const extEndWallX1 = wall.end.x
    const extEndWallY1 = wall.end.y
    const extEndWallX2 = wall.end.x + Math.cos(perpAngle) * extensionLengthShort
    const extEndWallY2 = wall.end.y + Math.sin(perpAngle) * extensionLengthShort
    
    ctx.beginPath()
    ctx.moveTo(extEndWallX1, extEndWallY1)
    ctx.lineTo(extEndWallX2, extEndWallY2)
    ctx.stroke()
    
    // Long line: centered on dimEnd, extending both ways (perpendicular to dimension line)
    const extEndDimX1 = dimEndX - Math.cos(perpAngle) * extensionLengthLong
    const extEndDimY1 = dimEndY - Math.sin(perpAngle) * extensionLengthLong
    const extEndDimX2 = dimEndX + Math.cos(perpAngle) * extensionLengthLong
    const extEndDimY2 = dimEndY + Math.sin(perpAngle) * extensionLengthLong
    
    ctx.beginPath()
    ctx.moveTo(extEndDimX1, extEndDimY1)
    ctx.lineTo(extEndDimX2, extEndDimY2)
    ctx.stroke()
    
    // Draw text with light background (no border box)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(
      textX - textWidth / 2 - padding,
      textY - 7 - padding,
      textWidth + padding * 2,
      14 + padding * 2
    )
    
    // Draw text
    ctx.fillStyle = '#333333'
    ctx.fillText(text, textX, textY)
  }

  const drawLayout = (ctx, width, height) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += gridScale) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridScale) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw walls with dimensions (with gaps for entrances/exits)
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 3
    layout.walls.forEach((wall, wallIdx) => {
      // Check for entrances/exits on this wall
      const entrancesOnWall = layout.entrances.filter(e => e.wallIndex === wallIdx)
      const exitsOnWall = layout.exits.filter(e => e.wallIndex === wallIdx)
      const openings = [...entrancesOnWall, ...exitsOnWall].sort((a, b) => a.offset - b.offset)
      
      if (openings.length === 0) {
        // Draw full wall
        ctx.beginPath()
        ctx.moveTo(wall.start.x, wall.start.y)
        ctx.lineTo(wall.end.x, wall.end.y)
        ctx.stroke()
      } else {
        // Draw wall segments with gaps
        const wallLength = getWallLength(wall)
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        
        let lastEnd = 0
        openings.forEach(opening => {
          // Draw segment before opening
          if (opening.offset > lastEnd) {
            const segStartX = wall.start.x + (dx / wallLength) * lastEnd
            const segStartY = wall.start.y + (dy / wallLength) * lastEnd
            const segEndX = wall.start.x + (dx / wallLength) * opening.offset
            const segEndY = wall.start.y + (dy / wallLength) * opening.offset
            
            ctx.beginPath()
            ctx.moveTo(segStartX, segStartY)
            ctx.lineTo(segEndX, segEndY)
            ctx.stroke()
          }
          lastEnd = opening.offset + opening.length
        })
        
        // Draw final segment after last opening
        if (lastEnd < wallLength) {
          const segStartX = wall.start.x + (dx / wallLength) * lastEnd
          const segStartY = wall.start.y + (dy / wallLength) * lastEnd
          
          ctx.beginPath()
          ctx.moveTo(segStartX, segStartY)
          ctx.lineTo(wall.end.x, wall.end.y)
          ctx.stroke()
        }
      }
      
      // Draw dimension line
      drawWallDimension(ctx, wall, wallIdx)
    })

    // Draw product sections
    layout.products.forEach((product, idx) => {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)'
      ctx.strokeStyle = '#6495ed'
      ctx.lineWidth = 2
      ctx.fillRect(product.x, product.y, product.width, product.height)
      ctx.strokeRect(product.x, product.y, product.width, product.height)
      
      // Label
      ctx.fillStyle = '#333'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        product.label || `Product ${idx + 1}`,
        product.x + product.width / 2,
        product.y + product.height / 2 + 5
      )
    })

    // Draw checkouts
    layout.checkouts.forEach(checkout => {
      ctx.fillStyle = '#4169e1'
      ctx.fillRect(checkout.x - 15, checkout.y - 10, 30, 20)
      ctx.strokeStyle = '#0000cd'
      ctx.lineWidth = 2
      ctx.strokeRect(checkout.x - 15, checkout.y - 10, 30, 20)
    })

    // Draw entrances
    layout.entrances.forEach((entrance, idx) => {
      if (!entrance.wallIndex || !layout.walls[entrance.wallIndex]) return
      
      const wall = layout.walls[entrance.wallIndex]
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      const perpAngle = angle + Math.PI / 2
      
      // Calculate entrance position along wall
      const entranceLength = entrance.length || 40
      const startOffset = entrance.offset || 0
      const centerX = wall.start.x + (dx / wallLength) * (startOffset + entranceLength / 2)
      const centerY = wall.start.y + (dy / wallLength) * (startOffset + entranceLength / 2)
      
      // Draw entrance as a gap in the wall (white rectangle)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      
      // Draw gap
      const gapStartX = wall.start.x + (dx / wallLength) * startOffset
      const gapStartY = wall.start.y + (dy / wallLength) * startOffset
      const gapEndX = wall.start.x + (dx / wallLength) * (startOffset + entranceLength)
      const gapEndY = wall.start.y + (dy / wallLength) * (startOffset + entranceLength)
      
      // Draw entrance indicator (green arc/line)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(gapStartX, gapStartY)
      ctx.lineTo(gapEndX, gapEndY)
      ctx.stroke()
      
      // Draw entrance marker (green circle at center)
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#008000'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw exits
    layout.exits.forEach((exit, idx) => {
      if (!exit.wallIndex || !layout.walls[exit.wallIndex]) return
      
      const wall = layout.walls[exit.wallIndex]
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      
      // Calculate exit position along wall
      const exitLength = exit.length || 40
      const startOffset = exit.offset || 0
      const centerX = wall.start.x + (dx / wallLength) * (startOffset + exitLength / 2)
      const centerY = wall.start.y + (dy / wallLength) * (startOffset + exitLength / 2)
      
      // Draw exit as a gap in the wall
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 4
      
      // Draw exit indicator (red arc/line)
      const gapStartX = wall.start.x + (dx / wallLength) * startOffset
      const gapStartY = wall.start.y + (dy / wallLength) * startOffset
      const gapEndX = wall.start.x + (dx / wallLength) * (startOffset + exitLength)
      const gapEndY = wall.start.y + (dy / wallLength) * (startOffset + exitLength)
      
      ctx.beginPath()
      ctx.moveTo(gapStartX, gapStartY)
      ctx.lineTo(gapEndX, gapEndY)
      ctx.stroke()
      
      // Draw exit marker (red circle at center)
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#8b0000'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    return snapToGridPoint(x, y)
  }

  const handleCanvasClick = (e) => {
    const pos = getCanvasCoordinates(e)
    
    if (tool === 'wall') {
      if (!isDrawing) {
        setCurrentWall({ start: pos, end: pos })
        setIsDrawing(true)
      } else {
        setLayout(prev => ({
          ...prev,
          walls: [...prev.walls, { start: currentWall.start, end: pos }]
        }))
        setIsDrawing(false)
        setCurrentWall(null)
      }
    } else if (tool === 'entrance') {
      const nearest = findNearestWall(pos.x, pos.y)
      if (!nearest) {
        alert('Please place entrance near a wall (within 30px)')
        return
      }
      
      const lengthInput = prompt('Enter entrance length in pixels (default: 40):', '40')
      const length = parseInt(lengthInput) || 40
      
      const wall = nearest.wall
      const wallLength = getWallLength(wall)
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      
      // Calculate offset along wall from start point
      const param = nearest.param
      const offset = param * wallLength
      
      // Ensure entrance fits on wall
      const clampedLength = Math.min(length, wallLength - offset)
      const finalLength = Math.max(clampedLength, 10)
      
      setLayout(prev => ({
        ...prev,
        entrances: [...prev.entrances, {
          wallIndex: wall.index,
          offset: offset,
          length: finalLength
        }]
      }))
    } else if (tool === 'exit') {
      const nearest = findNearestWall(pos.x, pos.y)
      if (!nearest) {
        alert('Please place exit near a wall (within 30px)')
        return
      }
      
      const lengthInput = prompt('Enter exit length in pixels (default: 40):', '40')
      const length = parseInt(lengthInput) || 40
      
      const wall = nearest.wall
      const wallLength = getWallLength(wall)
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      
      // Calculate offset along wall from start point
      const param = nearest.param
      const offset = param * wallLength
      
      // Ensure exit fits on wall
      const clampedLength = Math.min(length, wallLength - offset)
      const finalLength = Math.max(clampedLength, 10)
      
      setLayout(prev => ({
        ...prev,
        exits: [...prev.exits, {
          wallIndex: wall.index,
          offset: offset,
          length: finalLength
        }]
      }))
    } else if (tool === 'checkout') {
      setLayout(prev => ({
        ...prev,
        checkouts: [...prev.checkouts, pos]
      }))
    } else if (tool === 'product') {
      const label = prompt('Enter product section name (e.g., Produce, Dairy, Bakery):')
      if (label) {
        // Snap product section dimensions to grid
        const snappedWidth = Math.round(100 / gridScale) * gridScale || gridScale
        const snappedHeight = Math.round(60 / gridScale) * gridScale || gridScale
        const snappedX = pos.x - snappedWidth / 2
        const snappedY = pos.y - snappedHeight / 2
        const snappedPos = snapToGridPoint(snappedX, snappedY)
        
        setLayout(prev => ({
          ...prev,
          products: [...prev.products, {
            x: snappedPos.x,
            y: snappedPos.y,
            width: snappedWidth,
            height: snappedHeight,
            label: label
          }]
        }))
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (isDrawing && tool === 'wall') {
      const pos = getCanvasCoordinates(e)
      setCurrentWall(prev => ({ ...prev, end: pos }))
      
      // Redraw
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      drawLayout(ctx, canvas.width, canvas.height)
      
      // Draw current wall being drawn
      if (currentWall) {
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(currentWall.start.x, currentWall.start.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  const handleDeleteElement = (type, index) => {
    setLayout(prev => {
      const newLayout = { ...prev }
      if (type === 'wall') {
        newLayout.walls = newLayout.walls.filter((_, i) => i !== index)
        // Remove entrances/exits that were on this wall
        newLayout.entrances = newLayout.entrances.filter(e => e.wallIndex !== index)
        newLayout.exits = newLayout.exits.filter(e => e.wallIndex !== index)
        // Update wall indices for remaining entrances/exits
        newLayout.entrances = newLayout.entrances.map(e => ({
          ...e,
          wallIndex: e.wallIndex > index ? e.wallIndex - 1 : e.wallIndex
        }))
        newLayout.exits = newLayout.exits.map(e => ({
          ...e,
          wallIndex: e.wallIndex > index ? e.wallIndex - 1 : e.wallIndex
        }))
      } else if (type === 'product') {
        newLayout.products = newLayout.products.filter((_, i) => i !== index)
      } else if (type === 'checkout') {
        newLayout.checkouts = newLayout.checkouts.filter((_, i) => i !== index)
      } else if (type === 'entrance') {
        newLayout.entrances = newLayout.entrances.filter((_, i) => i !== index)
      } else if (type === 'exit') {
        newLayout.exits = newLayout.exits.filter((_, i) => i !== index)
      }
      return newLayout
    })
  }

  const handleClearAll = () => {
    if (confirm('Clear all elements? This cannot be undone.')) {
      setLayout({
        walls: [],
        entrances: [],
        exits: [],
        checkouts: [],
        products: []
      })
    }
  }

  const handleExport = () => {
    const json = JSON.stringify(layout, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'store-layout.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStartSimulation = () => {
    if (layout.entrances.length === 0 || layout.exits.length === 0 || layout.products.length === 0) {
      alert('Please add at least: one entrance, one exit, and one product section')
      return
    }
    onStartSimulation(layout)
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <h2>Store Layout Editor</h2>
        <div className="toolbar-buttons">
          <button 
            className={tool === 'wall' ? 'active' : ''}
            onClick={() => setTool('wall')}
          >
            Draw Wall
          </button>
          <button 
            className={tool === 'entrance' ? 'active' : ''}
            onClick={() => setTool('entrance')}
          >
            Place Entrance
          </button>
          <button 
            className={tool === 'exit' ? 'active' : ''}
            onClick={() => setTool('exit')}
          >
            Place Exit
          </button>
          <button 
            className={tool === 'checkout' ? 'active' : ''}
            onClick={() => setTool('checkout')}
          >
            Add Checkout
          </button>
          <button 
            className={tool === 'product' ? 'active' : ''}
            onClick={() => setTool('product')}
          >
            Add Product Section
          </button>
          <button onClick={handleClearAll} className="danger">
            Clear All
          </button>
          <button onClick={handleExport}>
            Export Layout
          </button>
          <button onClick={handleStartSimulation} className="primary">
            Start Simulation
          </button>
        </div>
        <div className="grid-controls">
          <label className="grid-control-label">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Snap to Grid
          </label>
          <label className="grid-control-label">
            Grid Scale:
            <input
              type="number"
              min="5"
              max="100"
              step="5"
              value={gridScale}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 20
                setGridScale(Math.max(5, Math.min(100, value)))
              }}
              className="grid-scale-input"
            />
            px
          </label>
        </div>
        <div className="unit-controls">
          <label className="grid-control-label">
            Units:
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value)}
              className="unit-select"
            >
              <option value="feet">Feet (ft)</option>
              <option value="yards">Yards (yd)</option>
              <option value="meters">Meters (m)</option>
            </select>
          </label>
          <label className="grid-control-label">
            Scale:
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={pixelsPerUnit}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 10
                setPixelsPerUnit(Math.max(1, Math.min(100, value)))
              }}
              className="grid-scale-input"
            />
            px/{unitSystem === 'feet' ? 'ft' : unitSystem === 'yards' ? 'yd' : 'm'}
          </label>
        </div>
      </div>

      <div className="editor-content">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="editor-canvas"
        />

        <div className="editor-sidebar">
          <h3>Layout Elements</h3>
          
          <div className="element-list">
            <h4>Walls ({layout.walls.length})</h4>
            {layout.walls.map((wall, idx) => (
              <div key={idx} className="element-item">
                <span>Wall {idx + 1}</span>
                <button onClick={() => handleDeleteElement('wall', idx)}>×</button>
              </div>
            ))}

            <h4>Product Sections ({layout.products.length})</h4>
            {layout.products.map((product, idx) => (
              <div key={idx} className="element-item">
                <span>{product.label || `Product ${idx + 1}`}</span>
                <button onClick={() => handleDeleteElement('product', idx)}>×</button>
              </div>
            ))}

            <h4>Checkouts ({layout.checkouts.length})</h4>
            {layout.checkouts.map((checkout, idx) => (
              <div key={idx} className="element-item">
                <span>Checkout {idx + 1}</span>
                <button onClick={() => handleDeleteElement('checkout', idx)}>×</button>
              </div>
            ))}

            <h4>Entrances ({layout.entrances.length})</h4>
            {layout.entrances.map((entrance, idx) => (
              <div key={idx} className="element-item">
                <span>Entrance {idx + 1} ({Math.round(entrance.length)}px)</span>
                <button onClick={() => handleDeleteElement('entrance', idx)}>×</button>
              </div>
            ))}

            <h4>Exits ({layout.exits.length})</h4>
            {layout.exits.map((exit, idx) => (
              <div key={idx} className="element-item">
                <span>Exit {idx + 1} ({Math.round(exit.length)}px)</span>
                <button onClick={() => handleDeleteElement('exit', idx)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
