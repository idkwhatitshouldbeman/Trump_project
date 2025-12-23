// Genetic algorithm for layout optimization

import { SimulationEngine } from './simulationEngine.js'

export class GeneticOptimizer {
  constructor(originalLayout, onProgress) {
    this.originalLayout = JSON.parse(JSON.stringify(originalLayout)) // Deep copy
    this.onProgress = onProgress
    this.populationSize = 20
    this.generation = 0
    this.bestLayout = null
    this.bestFitness = -Infinity
    this.isRunning = false
  }

  async optimize(maxGenerations = 50) {
    this.isRunning = true
    this.generation = 0

    // Initialize population
    let population = this.initializePopulation()

    while (this.generation < maxGenerations && this.isRunning) {
      // Evaluate fitness for each layout
      const evaluated = await this.evaluatePopulation(population)
      
      // Sort by fitness
      evaluated.sort((a, b) => b.fitness - a.fitness)

      // Update best
      if (evaluated[0].fitness > this.bestFitness) {
        this.bestFitness = evaluated[0].fitness
        this.bestLayout = JSON.parse(JSON.stringify(evaluated[0].layout))
      }

      // Report progress
      if (this.onProgress) {
        this.onProgress({
          generation: this.generation,
          bestFitness: this.bestFitness,
          bestLayout: this.bestLayout,
          avgFitness: evaluated.reduce((sum, e) => sum + e.fitness, 0) / evaluated.length
        })
      }

      // Selection: keep top 30%
      const survivors = evaluated.slice(0, Math.floor(this.populationSize * 0.3))

      // Crossover: create children
      const children = this.crossover(survivors)

      // Mutation
      this.mutate(children)

      // New generation: survivors + children
      population = [...survivors.map(s => s.layout), ...children]

      this.generation++
    }

    this.isRunning = false
    return {
      originalLayout: this.originalLayout,
      optimizedLayout: this.bestLayout,
      fitness: this.bestFitness,
      generations: this.generation
    }
  }

  stop() {
    this.isRunning = false
  }

  initializePopulation() {
    const population = []

    // First layout is the original
    population.push(JSON.parse(JSON.stringify(this.originalLayout)))

    // Generate 19 variations
    for (let i = 0; i < this.populationSize - 1; i++) {
      const layout = this.createVariation(this.originalLayout)
      population.push(layout)
    }

    return population
  }

  createVariation(layout) {
    const newLayout = JSON.parse(JSON.stringify(layout))

    // Keep walls, entrance, exit fixed
    // Only modify products and checkouts

    // Randomly swap product positions
    if (newLayout.products.length > 1) {
      const shuffled = [...newLayout.products].sort(() => Math.random() - 0.5)
      newLayout.products = shuffled.map((product, idx) => ({
        ...product,
        x: newLayout.products[idx].x,
        y: newLayout.products[idx].y
      }))
    }

    // Randomly move checkouts
    newLayout.checkouts = newLayout.checkouts.map(checkout => ({
      x: checkout.x + (Math.random() - 0.5) * 100,
      y: checkout.y + (Math.random() - 0.5) * 100
    }))

    // Randomly resize some products
    newLayout.products = newLayout.products.map(product => {
      if (Math.random() < 0.3) {
        return {
          ...product,
          width: Math.max(60, product.width + (Math.random() - 0.5) * 40),
          height: Math.max(40, product.height + (Math.random() - 0.5) * 30)
        }
      }
      return product
    })

    return newLayout
  }

  async evaluatePopulation(population) {
    const evaluations = []

    for (const layout of population) {
      const fitness = await this.evaluateLayout(layout)
      evaluations.push({ layout, fitness })
    }

    return evaluations
  }

  async evaluateLayout(layout) {
    return new Promise((resolve) => {
      const engine = new SimulationEngine(layout, () => {})
      
      let simulationTime = 0
      const maxTime = 5 * 60 * 1000 // 5 minutes max
      const targetCustomers = 30
      let customersSpawned = 0

      engine.start()

      const checkInterval = setInterval(() => {
        simulationTime += 1000

        // Spawn customers until we have 30
        if (customersSpawned < targetCustomers && engine.customers.length < 30) {
          engine.spawnCustomer()
          customersSpawned++
        }

        // Stop if all customers exited or max time reached
        if ((engine.customers.length === 0 && customersSpawned >= targetCustomers) || 
            simulationTime >= maxTime) {
          clearInterval(checkInterval)
          engine.stop()

          const metrics = engine.getMetrics()
          
          // Calculate fitness
          // Lower congestion, fewer bottlenecks, lower time = better
          const fitness = 1000 - 
            (metrics.avgCongestion * 5) - 
            (metrics.bottleneckCount * 10) - 
            (metrics.avgShoppingTime * 2)

          resolve(fitness)
        }
      }, 1000)
    })
  }

  crossover(parents) {
    const children = []
    const targetChildren = this.populationSize - Math.floor(this.populationSize * 0.3)

    for (let i = 0; i < targetChildren; i++) {
      const parent1 = parents[Math.floor(Math.random() * parents.length)].layout
      const parent2 = parents[Math.floor(Math.random() * parents.length)].layout

      const child = JSON.parse(JSON.stringify(parent1))

      // Mix product positions
      if (parent2.products.length === child.products.length) {
        const mixPoint = Math.floor(Math.random() * child.products.length)
        for (let j = mixPoint; j < child.products.length; j++) {
          if (parent2.products[j]) {
            child.products[j] = {
              ...child.products[j],
              x: parent2.products[j].x,
              y: parent2.products[j].y
            }
          }
        }
      }

      // Mix checkout positions
      if (parent2.checkouts.length === child.checkouts.length) {
        child.checkouts = child.checkouts.map((checkout, idx) => {
          if (Math.random() < 0.5 && parent2.checkouts[idx]) {
            return { ...parent2.checkouts[idx] }
          }
          return checkout
        })
      }

      children.push(child)
    }

    return children
  }

  mutate(children) {
    for (const child of children) {
      if (Math.random() < 0.2) { // 20% mutation rate
        // Swap two random product sections
        if (child.products.length > 1) {
          const idx1 = Math.floor(Math.random() * child.products.length)
          const idx2 = Math.floor(Math.random() * child.products.length)
          if (idx1 !== idx2) {
            const temp = { ...child.products[idx1] }
            child.products[idx1] = { ...child.products[idx2] }
            child.products[idx2] = temp
          }
        }

        // Move a checkout counter
        if (child.checkouts.length > 0 && Math.random() < 0.5) {
          const checkout = child.checkouts[Math.floor(Math.random() * child.checkouts.length)]
          checkout.x += (Math.random() - 0.5) * 50
          checkout.y += (Math.random() - 0.5) * 50
        }

        // Resize a section
        if (child.products.length > 0 && Math.random() < 0.5) {
          const product = child.products[Math.floor(Math.random() * child.products.length)]
          product.width = Math.max(60, product.width + (Math.random() - 0.5) * 40)
          product.height = Math.max(40, product.height + (Math.random() - 0.5) * 30)
        }
      }
    }
  }
}
