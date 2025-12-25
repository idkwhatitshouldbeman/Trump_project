# Testing Guide

## Quick Start Testing

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up Environment**
   - Create `.env` file in project root with:
     ```
     VITE_OPENROUTER_API_KEY=your_key_here
     ```
   - Or skip this if using Ollama (see below)

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - App will be at `http://localhost:5173`

## Test Checklist

### Phase 1: Editor Testing
- [ ] Canvas loads and displays grid
- [ ] Can draw walls by clicking two points
- [ ] Can place entrance (green marker)
- [ ] Can place exit (red marker)
- [ ] Can add checkout counters (blue rectangles)
- [ ] Can add product sections with labels
- [ ] Can delete elements from sidebar
- [ ] "Clear All" button works
- [ ] "Export Layout" downloads JSON
- [ ] Layout saves to localStorage automatically
- [ ] Layout loads from localStorage on page refresh
- [ ] "Start Simulation" validates required elements (entrance, exit, products)

### Phase 2: Simulation Testing
- [ ] Simulation view loads with layout
- [ ] Customers spawn from entrance
- [ ] Customers move around the store
- [ ] Customers are visible as colored dots
- [ ] Heat map toggle works
- [ ] Speed controls work (1x, 2x, 5x, 10x)
- [ ] Start/Pause/Stop buttons work
- [ ] Metrics panel updates in real-time
- [ ] Customers make AI decisions (check browser console for API calls)
- [ ] Customers collect items from product sections
- [ ] Customers go to checkout when done
- [ ] Customers exit the store
- [ ] Collision avoidance works (customers don't overlap)
- [ ] Vision range works (customers see nearby sections)

### Phase 3: AI Integration Testing
- [ ] OpenRouter API calls work (if API key set)
- [ ] Ollama fallback works (if Ollama running on localhost:11434)
- [ ] Fallback decision-making works if AI unavailable
- [ ] Decision cache reduces API calls
- [ ] AI makes realistic decisions (avoids crowds, considers distance)

### Phase 4: Optimization Testing
- [ ] "Run Optimization" button starts genetic algorithm
- [ ] Progress updates show generation number and fitness
- [ ] Optimization can be stopped early
- [ ] Optimization completes and shows results
- [ ] Multiple layout variations are generated
- [ ] Fitness scores improve over generations

### Phase 5: Dashboard Testing
- [ ] Dashboard shows after optimization completes
- [ ] Side-by-side comparison displays correctly
- [ ] Original layout renders correctly
- [ ] Optimized layout renders correctly
- [ ] Metrics comparison shows improvements
- [ ] Heat map toggle works on both layouts
- [ ] "Download Optimized Layout" exports JSON
- [ ] "Export as Image" works for both layouts
- [ ] "Back to Editor" returns to editor view

## Common Issues & Solutions

### Issue: Canvas not rendering
- **Solution**: Check browser console for errors. Ensure canvas has proper dimensions in CSS.

### Issue: AI not making decisions
- **Solution**: 
  - Check if OpenRouter API key is set in `.env`
  - Or start Ollama: `ollama serve` and `ollama pull llama3.2`
  - Check browser console for API errors
  - App will fall back to random decisions if AI unavailable

### Issue: Simulation runs slowly
- **Solution**: 
  - Reduce number of customers (edit `maxCustomers` in simulationEngine.js)
  - Increase speed multiplier
  - Optimization is intentionally slow (runs full simulations)

### Issue: Customers not moving
- **Solution**: 
  - Check that entrance and exit are placed
  - Check that product sections exist
  - Check browser console for errors

### Issue: Layout not saving
- **Solution**: 
  - Check browser localStorage (DevTools > Application > Local Storage)
  - Ensure layout object is valid JSON

## Performance Testing

- Test with 10 customers
- Test with 50 customers (max)
- Test optimization with 5 generations (quick test)
- Test optimization with 50 generations (full test)
- Monitor browser memory usage during long simulations

## Browser Compatibility

Tested browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari

## Notes

- AI API calls may take 1-2 seconds each
- Optimization can take 10-30 minutes depending on generations
- Large layouts may impact performance
- Heat map updates every frame (may be slow on low-end devices)




