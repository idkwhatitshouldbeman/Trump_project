# AI Store Layout Optimizer

An AI-powered web application for optimizing store layouts using customer simulation and genetic algorithms. This project was built for a presidential AI competition.

## Features

- **Interactive Store Layout Editor**: Draw walls, place entrances/exits, add checkout counters, and define product sections
- **AI-Powered Customer Simulation**: Realistic customer behavior using AI decision-making (OpenRouter API or Ollama)
- **Genetic Algorithm Optimization**: Automatically finds optimal layouts by evolving design variations
- **Real-time Visualization**: Watch customers shop with heat maps showing congestion patterns
- **Performance Metrics**: Track congestion, bottlenecks, and shopping times
- **Before/After Comparison**: See side-by-side results of optimization

## Tech Stack

- **Frontend**: React 18 + Vite
- **AI Integration**: OpenRouter API (with Ollama fallback for local development)
- **Visualization**: HTML5 Canvas
- **Optimization**: Genetic Algorithm implementation

## Setup Instructions

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Trump_project
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```
   Or manually:
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   VITE_OPENROUTER_API_KEY=your_key_here
   ```
   
   Get a free API key from [OpenRouter.ai](https://openrouter.ai)

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

### Optional: Ollama Setup (Backup AI)

If you want to use Ollama for local AI inference (no API key needed):

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Ollama will auto-start on `localhost:11434`
4. The app will automatically fall back to Ollama if OpenRouter is unavailable

## Usage

1. **Create a Store Layout**
   - Click "Draw Wall" to create walls by clicking two points
   - Place an entrance (green marker) and exit (red marker)
   - Add checkout counters (blue rectangles)
   - Add product sections (labeled rectangles) - you'll be prompted for names like "Produce", "Dairy", "Bakery"
   - Your layout is automatically saved to browser localStorage

2. **Run Simulation**
   - Click "Start Simulation" to begin
   - Watch AI customers shop with realistic behavior
   - Toggle heat map to see congestion patterns
   - Adjust simulation speed (1x, 2x, 5x, 10x)

3. **Optimize Layout**
   - Click "Run Optimization" to start the genetic algorithm
   - The system will evolve 20 layout variations over multiple generations
   - Watch progress in real-time
   - Stop early if you're satisfied with results

4. **View Results**
   - See side-by-side comparison of original vs optimized layout
   - Review metrics showing improvements
   - Export optimized layout as JSON or image
   - Use the optimized layout in the editor

## How It Works

### AI Customer Behavior

Each customer is an AI agent that:
- Has a random shopping list (3-5 items)
- Can see product sections within their vision range
- Makes decisions every 2 seconds using AI (OpenRouter/Ollama)
- Considers distance, crowd density, and shopping list
- Exhibits human-like behavior (may avoid crowds, browse items not on list)

### Genetic Algorithm

The optimization process:
1. **Initialization**: Creates 20 variations of your layout
2. **Evaluation**: Runs simulations on each layout, calculates fitness scores
3. **Selection**: Keeps top 30% of layouts
4. **Crossover**: Mixes features from top layouts to create children
5. **Mutation**: Randomly modifies some layouts
6. **Repeat**: Evolves over 50 generations (or until stopped)

Fitness is calculated based on:
- Average congestion (lower is better)
- Number of bottlenecks (fewer is better)
- Average shopping time (shorter is better)

## Project Structure

```
/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.jsx          # Layout editor
│   │   │   ├── Simulation.jsx      # Simulation viewer
│   │   │   └── Dashboard.jsx       # Results comparison
│   │   ├── utils/
│   │   │   ├── aiCustomer.js       # AI decision making
│   │   │   ├── simulationEngine.js # Simulation logic
│   │   │   └── geneticOptimizer.js # Genetic algorithm
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── package.json
└── README.md
```

## Deployment

### Vercel/Netlify

1. Push to GitHub
2. Connect repository to Vercel/Netlify
3. Add `VITE_OPENROUTER_API_KEY` to environment variables
4. Deploy!

The app is serverless-ready and works entirely client-side.

## Key Features for Competition

- **Visual Impact**: Real-time visualization of AI decisions
- **Clear Improvement**: Quantified before/after metrics
- **Realistic Behavior**: Human-like customer decisions, not perfect pathfinding
- **Generative Design**: Multiple iterations improving over time
- **Practical Application**: Solves real-world store layout problems

## License

MIT
