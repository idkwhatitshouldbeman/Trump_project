import React, { useRef, useEffect } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function Dashboard({ results, onBack }) {
  const { originalLayout, optimizedLayout, originalMetrics, optimizedMetrics } = results || {}
  
  const handleUseOptimized = () => {
    // Convert optimized layout back to editor format and save
    if (optimizedLayout) {
      // This would need conversion logic - for now just go back to editor
      onBack()
    }
  }
  
  const handleRunAgain = () => {
    onBack()
  }
  const originalCanvasRef = useRef(null);
  const optimizedCanvasRef = useRef(null);

  useEffect(() => {
    if (originalCanvasRef.current && originalLayout) {
      drawLayout(originalCanvasRef.current, originalLayout, originalMetrics);
    }
    if (optimizedCanvasRef.current && optimizedLayout) {
      drawLayout(optimizedCanvasRef.current, optimizedLayout, optimizedMetrics);
    }
  }, [originalLayout, optimizedLayout, originalMetrics, optimizedMetrics]);

  const drawLayout = (canvas, layout, metrics) => {
    if (!canvas || !layout) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw heat map if metrics available
    if (metrics && metrics.congestionMap) {
      drawHeatMap(ctx, metrics.congestionMap);
    }
    
    // Draw layout elements
    layout.elements.forEach((element) => {
      if (element.type === 'wall') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        if (element.points && element.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
        }
      } else if (element.type === 'entrance') {
        ctx.fillStyle = '#00cc00';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('IN', element.x, element.y + 4);
      } else if (element.type === 'exit') {
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OUT', element.x, element.y + 4);
      } else if (element.type === 'checkout') {
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Checkout', element.x + element.width / 2, element.y + element.height / 2 + 4);
      } else if (element.type === 'product') {
        ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(element.name, element.x + element.width / 2, element.y + element.height / 2 + 5);
      }
    });
  };

  const drawHeatMap = (ctx, congestionMap) => {
    if (!congestionMap || !(congestionMap instanceof Map)) return;
    
    const gridSize = 20;
    const maxCongestion = Math.max(...Array.from(congestionMap.values()), 1);
    
    congestionMap.forEach((count, key) => {
      const [gridX, gridY] = key.split(',').map(Number);
      const x = gridX * gridSize;
      const y = gridY * gridSize;
      
      const intensity = count / maxCongestion;
      const alpha = Math.min(intensity * 0.7, 0.7);
      
      if (intensity > 0.3) {
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      } else if (intensity > 0.1) {
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
      }
      
      ctx.fillRect(x, y, gridSize, gridSize);
    });
  };

  const calculateImprovement = (original, optimized) => {
    if (!original || !optimized || original === 0) return 0;
    return ((original - optimized) / original * 100).toFixed(1);
  };

  const exportLayout = (layout, filename) => {
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsImage = (canvas, filename) => {
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (!optimizedLayout) {
    return (
      <div className="dashboard">
        <p>Run optimization to see results comparison.</p>
      </div>
    );
  }

  const congestionImprovement = calculateImprovement(
    originalMetrics?.avgCongestion || 0,
    optimizedMetrics?.avgCongestion || 0
  );
  const timeImprovement = calculateImprovement(
    originalMetrics?.avgShoppingTime || 0,
    optimizedMetrics?.avgShoppingTime || 0
  );
  const bottleneckImprovement = calculateImprovement(
    originalMetrics?.bottleneckCount || 0,
    optimizedMetrics?.bottleneckCount || 0
  );

  return (
    <div className="dashboard">
      <h2>Optimization Results</h2>
      
      <div className="comparison-container">
        <div className="layout-comparison">
          <div className="layout-panel">
            <h3>Original Layout</h3>
            <canvas
              ref={originalCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{ border: '1px solid #ccc' }}
            />
            <div className="layout-actions">
              <button onClick={() => exportLayout(originalLayout, 'original-layout.json')}>
                Export JSON
              </button>
              <button onClick={() => exportAsImage(originalCanvasRef.current, 'original-layout.png')}>
                Export Image
              </button>
            </div>
          </div>
          
          <div className="layout-panel">
            <h3>Optimized Layout</h3>
            <canvas
              ref={optimizedCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{ border: '1px solid #ccc' }}
            />
            <div className="layout-actions">
              <button onClick={() => exportLayout(optimizedLayout, 'optimized-layout.json')}>
                Export JSON
              </button>
              <button onClick={() => exportAsImage(optimizedCanvasRef.current, 'optimized-layout.png')}>
                Export Image
              </button>
            </div>
          </div>
        </div>
        
        <div className="metrics-comparison">
          <h3>Metrics Comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Original</th>
                <th>Optimized</th>
                <th>Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Congestion Score</td>
                <td>{(originalMetrics?.avgCongestion || 0).toFixed(2)}</td>
                <td>{(optimizedMetrics?.avgCongestion || 0).toFixed(2)}</td>
                <td className={congestionImprovement > 0 ? 'improvement' : ''}>
                  {congestionImprovement > 0 ? '+' : ''}{congestionImprovement}%
                </td>
              </tr>
              <tr>
                <td>Avg Shopping Time</td>
                <td>{(originalMetrics?.avgShoppingTime || 0).toFixed(1)}s</td>
                <td>{(optimizedMetrics?.avgShoppingTime || 0).toFixed(1)}s</td>
                <td className={timeImprovement > 0 ? 'improvement' : ''}>
                  {timeImprovement > 0 ? '+' : ''}{timeImprovement}%
                </td>
              </tr>
              <tr>
                <td>Bottleneck Count</td>
                <td>{originalMetrics?.bottleneckCount || 0}</td>
                <td>{optimizedMetrics?.bottleneckCount || 0}</td>
                <td className={bottleneckImprovement > 0 ? 'improvement' : ''}>
                  {bottleneckImprovement > 0 ? '+' : ''}{bottleneckImprovement}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="dashboard-actions">
          <button onClick={handleUseOptimized} className="primary">
            Use This Layout
          </button>
          <button onClick={handleRunAgain}>
            Run Again
          </button>
          <button onClick={onBack}>
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
}
