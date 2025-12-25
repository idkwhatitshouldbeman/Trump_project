import React, { useRef, useEffect, useState, useCallback } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function Editor({ initialLayout, onStartSimulation }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('wall'); // wall, entrance, exit, checkout, product
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWall, setCurrentWall] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [productLabel, setProductLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelPosition, setLabelPosition] = useState({ x: 0, y: 0 });
  
  // Initialize layout state
  const [layout, setLayout] = useState(() => {
    if (initialLayout && initialLayout.elements) {
      return initialLayout;
    }
    return { elements: [] };
  });

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout && initialLayout.elements) {
      setLayout(initialLayout);
    }
  }, [initialLayout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    drawCanvas(ctx);
  }, [layout, selectedElement, currentWall]);

  const drawCanvas = (ctx) => {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw elements
    if (!layout || !layout.elements) return;
    layout.elements.forEach((element, index) => {
      const isSelected = selectedElement === index;
      
      if (element.type === 'wall') {
        ctx.strokeStyle = isSelected ? '#ff0000' : '#000000';
        ctx.lineWidth = isSelected ? 3 : 2;
        if (element.points && element.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
        }
      } else if (element.type === 'entrance') {
        ctx.fillStyle = isSelected ? '#00ff00' : '#00cc00';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('IN', element.x, element.y + 4);
      } else if (element.type === 'exit') {
        ctx.fillStyle = isSelected ? '#ff0000' : '#cc0000';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OUT', element.x, element.y + 4);
      } else if (element.type === 'checkout') {
        ctx.fillStyle = isSelected ? '#0066ff' : '#0066cc';
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Checkout', element.x + element.width / 2, element.y + element.height / 2 + 4);
      } else if (element.type === 'product') {
        ctx.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.5)' : 'rgba(255, 200, 0, 0.3)';
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeStyle = isSelected ? '#ff8800' : '#ffaa00';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(element.name, element.x + element.width / 2, element.y + element.height / 2 + 5);
      }
    });
    
    // Draw current wall being drawn
    if (currentWall && currentWall.points.length > 0) {
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentWall.points[0].x, currentWall.points[0].y);
      for (let i = 1; i < currentWall.points.length; i++) {
        ctx.lineTo(currentWall.points[i].x, currentWall.points[i].y);
      }
      ctx.stroke();
    }
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasCoordinates(e);
    
    if (tool === 'wall') {
      setIsDrawing(true);
      setCurrentWall({
        points: [{ x: pos.x, y: pos.y }]
      });
    } else if (tool === 'entrance') {
      addElement({ type: 'entrance', x: pos.x, y: pos.y });
    } else if (tool === 'exit') {
      addElement({ type: 'exit', x: pos.x, y: pos.y });
    } else if (tool === 'checkout') {
      addElement({ 
        type: 'checkout', 
        x: pos.x - 30, 
        y: pos.y - 15, 
        width: 60, 
        height: 30 
      });
    } else if (tool === 'product') {
      setLabelPosition({ x: pos.x, y: pos.y });
      setShowLabelInput(true);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasCoordinates(e);
    
    if (tool === 'wall' && isDrawing && currentWall) {
      const lastPoint = currentWall.points[currentWall.points.length - 1];
      const distance = Math.sqrt(
        Math.pow(pos.x - lastPoint.x, 2) + 
        Math.pow(pos.y - lastPoint.y, 2)
      );
      
      // Add point if far enough from last point
      if (distance > 10) {
        setCurrentWall({
          points: [...currentWall.points, { x: pos.x, y: pos.y }]
        });
      }
    }
  };

  const handleMouseUp = (e) => {
    if (tool === 'wall' && isDrawing && currentWall && currentWall.points.length >= 2) {
      addElement({
        type: 'wall',
        points: currentWall.points
      });
      setCurrentWall(null);
    }
    setIsDrawing(false);
  };

  const handleProductLabelSubmit = () => {
    if (productLabel.trim()) {
      addElement({
        type: 'product',
        x: labelPosition.x - 50,
        y: labelPosition.y - 25,
        width: 100,
        height: 50,
        name: productLabel.trim()
      });
      setProductLabel('');
      setShowLabelInput(false);
    }
  };

  const addElement = (element) => {
    const newLayout = {
      ...layout,
      elements: [...(layout.elements || []), element]
    };
    setLayout(newLayout);
    saveToLocalStorage(newLayout);
  };

  const handleCanvasClick = (e) => {
    const pos = getCanvasCoordinates(e);
    
    // Check if clicking on existing element
    if (!layout || !layout.elements) return;
    for (let i = layout.elements.length - 1; i >= 0; i--) {
      const element = layout.elements[i];
      
      if (element.type === 'wall' && element.points) {
        // Check if click is near wall
        for (let j = 0; j < element.points.length - 1; j++) {
          const p1 = element.points[j];
          const p2 = element.points[j + 1];
          const dist = distanceToLineSegment(pos.x, pos.y, p1.x, p1.y, p2.x, p2.y);
          if (dist < 10) {
            setSelectedElement(i);
            return;
          }
        }
      } else if (element.type === 'entrance' || element.type === 'exit') {
        const dist = Math.sqrt(
          Math.pow(pos.x - element.x, 2) + 
          Math.pow(pos.y - element.y, 2)
        );
        if (dist < 20) {
          setSelectedElement(i);
          return;
        }
      } else if (element.type === 'checkout' || element.type === 'product') {
        if (pos.x >= element.x && pos.x <= element.x + element.width &&
            pos.y >= element.y && pos.y <= element.y + element.height) {
          setSelectedElement(i);
          return;
        }
      }
    }
    
    setSelectedElement(null);
  };

  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const deleteSelected = () => {
    if (selectedElement !== null && layout && layout.elements) {
      const newLayout = {
        ...layout,
        elements: layout.elements.filter((_, i) => i !== selectedElement)
      };
      setLayout(newLayout);
      saveToLocalStorage(newLayout);
      setSelectedElement(null);
    }
  };

  const clearAll = () => {
    if (window.confirm('Clear all elements?')) {
      const newLayout = { elements: [] };
      setLayout(newLayout);
      saveToLocalStorage(newLayout);
      setSelectedElement(null);
    }
  };
  
  const handleStartSimulation = () => {
    if (!layout || !layout.elements) {
      alert('Please create a layout first!');
      return;
    }
    
    // Validate required elements
    const hasEntrance = layout.elements.some(e => e.type === 'entrance');
    const hasExit = layout.elements.some(e => e.type === 'exit');
    const hasProducts = layout.elements.some(e => e.type === 'product');
    
    if (!hasEntrance) {
      alert('Please add at least one entrance!');
      return;
    }
    if (!hasExit) {
      alert('Please add at least one exit!');
      return;
    }
    if (!hasProducts) {
      alert('Please add at least one product section!');
      return;
    }
    
    // Convert layout format for simulation
    const simulationLayout = convertLayoutForSimulation(layout);
    if (onStartSimulation) {
      onStartSimulation(simulationLayout);
    }
  };
  
  // Convert Editor layout format to Simulation format
  const convertLayoutForSimulation = (editorLayout) => {
    const walls = [];
    const products = [];
    const checkouts = [];
    let entrance = null;
    let exit = null;
    
    editorLayout.elements.forEach(element => {
      if (element.type === 'wall' && element.points && element.points.length >= 2) {
        // Convert wall points to line segments
        for (let i = 0; i < element.points.length - 1; i++) {
          walls.push({
            start: { x: element.points[i].x, y: element.points[i].y },
            end: { x: element.points[i + 1].x, y: element.points[i + 1].y }
          });
        }
      } else if (element.type === 'product') {
        products.push({
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          label: element.name || 'Product'
        });
      } else if (element.type === 'checkout') {
        checkouts.push({
          x: element.x + element.width / 2,
          y: element.y + element.height / 2
        });
      } else if (element.type === 'entrance') {
        entrance = { x: element.x, y: element.y };
      } else if (element.type === 'exit') {
        exit = { x: element.x, y: element.y };
      }
    });
    
    // Convert entrance/exit to wall-based format for simulation engine
    const entrances = entrance ? [{
      wallIndex: 0,
      offset: 0,
      length: 40
    }] : [];
    
    const exits = exit ? [{
      wallIndex: walls.length > 0 ? 0 : -1,
      offset: 0,
      length: 40
    }] : [];
    
    return {
      walls,
      products,
      checkouts,
      entrance,
      exit,
      entrances,
      exits
    };
  };

  const exportLayout = () => {
    if (!layout) return;
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToLocalStorage = (layoutToSave) => {
    localStorage.setItem('storeLayout', JSON.stringify(layoutToSave));
  };

  return (
    <div className="editor">
      <div className="toolbar">
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
        <button onClick={deleteSelected} disabled={selectedElement === null}>
          Delete Selected
        </button>
        <button onClick={clearAll}>Clear All</button>
        <button onClick={exportLayout}>Export Layout</button>
        <button 
          onClick={handleStartSimulation}
          className="start-btn"
          style={{ 
            background: '#27ae60', 
            color: 'white', 
            fontWeight: 'bold',
            marginLeft: 'auto'
          }}
        >
          Start Simulation
        </button>
      </div>
      
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
        />
      </div>
      
      {showLabelInput && (
        <div className="label-input-overlay">
          <div className="label-input-box">
            <label>Product Section Name:</label>
            <input
              type="text"
              value={productLabel}
              onChange={(e) => setProductLabel(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleProductLabelSubmit();
                }
              }}
              autoFocus
            />
            <div>
              <button onClick={handleProductLabelSubmit}>Add</button>
              <button onClick={() => {
                setShowLabelInput(false);
                setProductLabel('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
