// Simulation engine for running customer simulations

export class SimulationEngine {
  constructor(layout, onUpdate) {
    this.layout = layout
    this.onUpdate = onUpdate
    this.customers = []
    this.time = 0
    this.lastSpawnTime = 0
    this.spawnInterval = 5000 // 5 seconds
    this.maxCustomers = 50
    this.frameRate = 10 // 10 FPS
    this.frameTime = 1000 / this.frameRate
    this.isRunning = false
    this.animationFrame = null
    this.lastFrameTime = Date.now()
    this.speedMultiplier = 1
    
    // Metrics
    this.metrics = {
      totalCustomers: 0,
      completedCustomers: 0,
      avgShoppingTime: 0,
      congestionData: new Map(), // Map of grid cells to customer counts
      bottleneckLocations: []
    }
  }

  start() {
    this.isRunning = true
    this.time = 0
    this.customers = []
    this.metrics = {
      totalCustomers: 0,
      completedCustomers: 0,
      avgShoppingTime: 0,
      congestionData: new Map(),
      bottleneckLocations: []
    }
    this.run()
  }

  pause() {
    this.isRunning = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
  }

  stop() {
    this.pause()
    this.customers = []
    this.time = 0
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier
  }

  run() {
    if (!this.isRunning) return

    const now = Date.now()
    const deltaTime = (now - this.lastFrameTime) * this.speedMultiplier
    this.lastFrameTime = now

    // Update simulation time
    this.time += deltaTime

    // Spawn new customers
    if (this.time - this.lastSpawnTime >= this.spawnInterval && 
        this.customers.length < this.maxCustomers) {
      this.spawnCustomer()
      this.lastSpawnTime = this.time
    }

    // Update customers
    this.updateCustomers(deltaTime)

    // Update congestion map
    this.updateCongestionMap()

    // Call update callback
    if (this.onUpdate) {
      this.onUpdate({
        customers: [...this.customers],
        time: this.time,
        metrics: this.getMetrics()
      })
    }

    this.animationFrame = requestAnimationFrame(() => this.run())
  }

  // Get position of an entrance from wall data
  getEntrancePosition(entrance) {
    if (!entrance.wallIndex || !this.layout.walls[entrance.wallIndex]) return null
    const wall = this.layout.walls[entrance.wallIndex]
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dy * dy)
    const entranceLength = entrance.length || 40
    const centerOffset = entrance.offset + entranceLength / 2
    return {
      x: wall.start.x + (dx / wallLength) * centerOffset,
      y: wall.start.y + (dy / wallLength) * centerOffset
    }
  }

  // Get position of an exit from wall data
  getExitPosition(exit) {
    if (!exit.wallIndex || !this.layout.walls[exit.wallIndex]) return null
    const wall = this.layout.walls[exit.wallIndex]
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dy * dy)
    const exitLength = exit.length || 40
    const centerOffset = exit.offset + exitLength / 2
    return {
      x: wall.start.x + (dx / wallLength) * centerOffset,
      y: wall.start.y + (dy / wallLength) * centerOffset
    }
  }

  spawnCustomer() {
    if (!this.layout.entrances || this.layout.entrances.length === 0) return

    // Pick a random entrance
    const entrance = this.layout.entrances[Math.floor(Math.random() * this.layout.entrances.length)]
    const entrancePos = this.getEntrancePosition(entrance)
    if (!entrancePos) return

    const shoppingList = this.generateShoppingList()
    const customer = {
      id: Date.now() + Math.random(),
      x: entrancePos.x,
      y: entrancePos.y,
      targetX: entrancePos.x,
      targetY: entrancePos.y,
      speed: 30 + Math.random() * 20, // pixels per second
      shoppingList: shoppingList,
      collected: [],
      status: 'shopping', // 'shopping', 'checkout', 'exiting'
      lastDecisionTime: 0,
      decisionInterval: 2000, // Make decision every 2 seconds
      currentTarget: null,
      targetType: null, // 'product', 'checkout', 'exit'
      waitTime: 0,
      spawnTime: this.time,
      visionRange: 150
    }

    this.customers.push(customer)
    this.metrics.totalCustomers++
  }

  generateShoppingList() {
    const allProducts = this.layout.products.map(p => p.label)
    const count = 3 + Math.floor(Math.random() * 3) // 3-5 items
    const shuffled = [...allProducts].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  async updateCustomers(deltaTime) {
    for (const customer of this.customers) {
      // Handle waiting (at product section or checkout)
      if (customer.waitTime > 0) {
        customer.waitTime -= deltaTime
        continue
      }

      // Make AI decision periodically
      if (this.time - customer.lastDecisionTime >= customer.decisionInterval) {
        await this.makeCustomerDecision(customer)
        customer.lastDecisionTime = this.time
      }

      // Move toward target
      this.moveCustomer(customer, deltaTime)

      // Check if reached target
      this.checkTargetReached(customer)
    }

    // Remove customers who exited
    this.customers = this.customers.filter(c => c.status !== 'exited')
  }

  async makeCustomerDecision(customer) {
    // Calculate visible sections
    const visibleSections = this.getVisibleSections(customer)
    
    // Import AI decision maker
    const { makeAIDecision } = await import('./aiCustomer.js')
    const decision = await makeAIDecision(
      customer,
      visibleSections,
      customer.shoppingList,
      customer.collected
    )

    // Set target based on decision
    if (decision.type === 'product' && decision.target) {
      const product = this.layout.products.find(p => p.label === decision.target.name)
      if (product) {
        customer.targetX = product.x + product.width / 2
        customer.targetY = product.y + product.height / 2
        customer.currentTarget = product
        customer.targetType = 'product'
      }
    } else if (decision.type === 'checkout' && this.layout.checkouts.length > 0) {
      const checkout = this.layout.checkouts[0] // Use first checkout
      customer.targetX = checkout.x
      customer.targetY = checkout.y
      customer.currentTarget = checkout
      customer.targetType = 'checkout'
      customer.status = 'checkout'
    } else if (decision.type === 'exit' && this.layout.exits && this.layout.exits.length > 0) {
      // Pick closest exit
      let closestExit = null
      let minDist = Infinity
      for (const exit of this.layout.exits) {
        const exitPos = this.getExitPosition(exit)
        if (exitPos) {
          const dx = exitPos.x - customer.x
          const dy = exitPos.y - customer.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDist) {
            minDist = dist
            closestExit = exitPos
          }
        }
      }
      if (closestExit) {
        customer.targetX = closestExit.x
        customer.targetY = closestExit.y
        customer.currentTarget = closestExit
        customer.targetType = 'exit'
        customer.status = 'exiting'
      }
    }
  }

  getVisibleSections(customer) {
    const visible = []
    
    for (const product of this.layout.products) {
      const centerX = product.x + product.width / 2
      const centerY = product.y + product.height / 2
      const dx = centerX - customer.x
      const dy = centerY - customer.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= customer.visionRange) {
        // Check if line of sight is blocked by walls (simplified)
        const hasLineOfSight = this.checkLineOfSight(customer.x, customer.y, centerX, centerY)
        
        if (hasLineOfSight) {
          const crowdCount = this.countCustomersNear(centerX, centerY, 30)
          visible.push({
            name: product.label,
            distance: distance / 10, // Convert pixels to approximate feet
            crowdCount: crowdCount
          })
        }
      }
    }

    return visible
  }

  checkLineOfSight(x1, y1, x2, y2) {
    // Simplified line-of-sight check
    // Check if line intersects any wall
    for (const wall of this.layout.walls) {
      if (this.lineIntersectsLine(x1, y1, x2, y2, wall.start.x, wall.start.y, wall.end.x, wall.end.y)) {
        return false
      }
    }
    return true
  }

  lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 0.001) return false

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }

  countCustomersNear(x, y, radius) {
    return this.customers.filter(c => {
      const dx = c.x - x
      const dy = c.y - y
      return Math.sqrt(dx * dx + dy * dy) <= radius
    }).length
  }

  moveCustomer(customer, deltaTime) {
    const dx = customer.targetX - customer.x
    const dy = customer.targetY - customer.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 5) {
      return // Already at target
    }

    // Check for nearby customers (collision avoidance)
    const nearbyCustomers = this.customers.filter(c => {
      if (c.id === customer.id) return false
      const dx = c.x - customer.x
      const dy = c.y - customer.y
      return Math.sqrt(dx * dx + dy * dy) < 20
    })

    let speed = customer.speed
    if (nearbyCustomers.length > 0) {
      speed *= 0.5 // Slow down near other customers
      
      // Try to move around
      const angle = Math.atan2(dy, dx)
      const avoidAngle = angle + (Math.random() - 0.5) * 0.5
      const moveX = Math.cos(avoidAngle) * speed * (deltaTime / 1000)
      const moveY = Math.sin(avoidAngle) * speed * (deltaTime / 1000)
      
      customer.x += moveX
      customer.y += moveY
    } else {
      // Normal movement
      const moveX = (dx / distance) * speed * (deltaTime / 1000)
      const moveY = (dy / distance) * speed * (deltaTime / 1000)
      
      customer.x += moveX
      customer.y += moveY
    }

    // Keep customer in bounds (simple check)
    customer.x = Math.max(0, Math.min(customer.x, 1200))
    customer.y = Math.max(0, Math.min(customer.y, 800))
  }

  checkTargetReached(customer) {
    const dx = customer.targetX - customer.x
    const dy = customer.targetY - customer.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 15) {
      if (customer.targetType === 'product' && customer.currentTarget) {
        // Check if this product is on shopping list
        const productName = customer.currentTarget.label
        if (customer.shoppingList.includes(productName) && 
            !customer.collected.includes(productName)) {
          customer.collected.push(productName)
          customer.waitTime = 3000 // Wait 3 seconds at product
        }
      } else if (customer.targetType === 'checkout') {
        if (customer.shoppingList.every(item => customer.collected.includes(item))) {
          customer.waitTime = 5000 // Wait 5 seconds at checkout
          customer.status = 'exiting'
          // Set exit as next target
          if (this.layout.exits && this.layout.exits.length > 0) {
            // Pick closest exit
            let closestExit = null
            let minDist = Infinity
            for (const exit of this.layout.exits) {
              const exitPos = this.getExitPosition(exit)
              if (exitPos) {
                const dx = exitPos.x - customer.x
                const dy = exitPos.y - customer.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < minDist) {
                  minDist = dist
                  closestExit = exitPos
                }
              }
            }
            if (closestExit) {
              customer.targetX = closestExit.x
              customer.targetY = closestExit.y
              customer.targetType = 'exit'
            }
          }
        }
      } else if (customer.targetType === 'exit') {
        customer.status = 'exited'
        const shoppingTime = this.time - customer.spawnTime
        this.metrics.completedCustomers++
        const totalTime = this.metrics.avgShoppingTime * (this.metrics.completedCustomers - 1) + shoppingTime
        this.metrics.avgShoppingTime = totalTime / this.metrics.completedCustomers
      }
    }
  }

  updateCongestionMap() {
    this.metrics.congestionData.clear()
    const gridSize = 50

    for (const customer of this.customers) {
      const gridX = Math.floor(customer.x / gridSize)
      const gridY = Math.floor(customer.y / gridSize)
      const key = `${gridX},${gridY}`
      this.metrics.congestionData.set(key, (this.metrics.congestionData.get(key) || 0) + 1)
    }

    // Find bottlenecks (cells with 3+ customers)
    this.metrics.bottleneckLocations = []
    for (const [key, count] of this.metrics.congestionData.entries()) {
      if (count >= 3) {
        const [x, y] = key.split(',').map(Number)
        this.metrics.bottleneckLocations.push({
          x: x * gridSize + gridSize / 2,
          y: y * gridSize + gridSize / 2,
          intensity: count
        })
      }
    }
  }

  getMetrics() {
    const congestionScores = Array.from(this.metrics.congestionData.values())
    const avgCongestion = congestionScores.length > 0
      ? congestionScores.reduce((a, b) => a + b, 0) / congestionScores.length
      : 0

    return {
      ...this.metrics,
      avgCongestion: Math.round(avgCongestion * 10) / 10,
      currentCustomers: this.customers.length,
      bottleneckCount: this.metrics.bottleneckLocations.length,
      avgShoppingTime: Math.round(this.metrics.avgShoppingTime / 1000) // Convert to seconds
    }
  }
}
