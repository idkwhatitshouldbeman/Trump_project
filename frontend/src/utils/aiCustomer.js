// AI Customer decision making using OpenRouter API or Ollama

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions'
const OLLAMA_API = 'http://localhost:11434/api/generate'

// Cache for similar decisions to reduce API calls
const decisionCache = new Map()

const getCacheKey = (visibleSections, shoppingList, collected) => {
  return JSON.stringify({
    sections: visibleSections.map(s => s.name).sort(),
    list: shoppingList.sort(),
    collected: collected.sort()
  })
}

export const makeAIDecision = async (customer, visibleSections, shoppingList, collected) => {
  // Check cache first
  const cacheKey = getCacheKey(visibleSections, shoppingList, collected)
  if (decisionCache.has(cacheKey)) {
    return decisionCache.get(cacheKey)
  }

  // Build prompt
  const visibleText = visibleSections.map(s => {
    const distance = Math.round(s.distance)
    const crowd = s.crowdCount
    return `${s.name} (${distance} feet away, ${crowd} ${crowd === 1 ? 'person' : 'people'} there)`
  }).join(', ')

  const needsText = shoppingList.filter(item => !collected.includes(item)).join(', ')
  const hasText = collected.length > 0 ? collected.join(', ') : 'nothing'

  const prompt = `You are shopping in a store. You can see: ${visibleText || 'nothing'}. Your shopping list needs: [${needsText}]. You already have: [${hasText}]. Where do you go next? Respond with ONLY the section name, 'checkout', or 'exit'. Be realistic - you might avoid crowded areas or browse items not on your list.`

  try {
    // Try OpenRouter first
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    if (apiKey) {
      const response = await fetch(OPENROUTER_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5-8b',
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const decision = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'checkout'
        const result = parseDecision(decision, visibleSections, shoppingList, collected)
        decisionCache.set(cacheKey, result)
        return result
      }
    }

    // Fallback to Ollama
    const ollamaResponse = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false
      })
    })

    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json()
      const decision = data.response?.trim().toLowerCase() || 'checkout'
      const result = parseDecision(decision, visibleSections, shoppingList, collected)
      decisionCache.set(cacheKey, result)
      return result
    }
  } catch (error) {
    console.warn('AI API error, using fallback:', error)
  }

  // Fallback: make a reasonable random decision
  return makeFallbackDecision(visibleSections, shoppingList, collected)
}

const parseDecision = (decision, visibleSections, shoppingList, collected) => {
  decision = decision.toLowerCase().trim()
  
  // Check for checkout/exit
  if (decision.includes('checkout') || decision.includes('exit')) {
    if (shoppingList.every(item => collected.includes(item))) {
      return { type: 'checkout', target: null }
    }
  }
  if (decision.includes('exit') && collected.length === shoppingList.length) {
    return { type: 'exit', target: null }
  }

  // Try to match a product section
  for (const section of visibleSections) {
    const sectionName = section.name.toLowerCase()
    if (decision.includes(sectionName) || sectionName.includes(decision)) {
      // Check if this section has items we need
      const needsItem = shoppingList.some(item => 
        item.toLowerCase().includes(sectionName) || 
        sectionName.includes(item.toLowerCase())
      )
      if (needsItem && !collected.includes(section.name)) {
        return { type: 'product', target: section }
      }
    }
  }

  // If no match, use fallback
  return makeFallbackDecision(visibleSections, shoppingList, collected)
}

const makeFallbackDecision = (visibleSections, shoppingList, collected) => {
  // If we have everything, go to checkout
  if (shoppingList.every(item => collected.includes(item))) {
    return { type: 'checkout', target: null }
  }

  // Find sections with items we need
  const neededSections = visibleSections.filter(section => {
    const sectionName = section.name.toLowerCase()
    return shoppingList.some(item => {
      const itemName = item.toLowerCase()
      return itemName.includes(sectionName) || sectionName.includes(itemName)
    }) && !collected.includes(section.name)
  })

  if (neededSections.length > 0) {
    // Prefer less crowded sections
    neededSections.sort((a, b) => {
      if (a.crowdCount !== b.crowdCount) {
        return a.crowdCount - b.crowdCount
      }
      return a.distance - b.distance
    })
    return { type: 'product', target: neededSections[0] }
  }

  // If nothing visible matches, go to closest section or checkout
  if (visibleSections.length > 0) {
    visibleSections.sort((a, b) => a.distance - b.distance)
    return { type: 'product', target: visibleSections[0] }
  }

  return { type: 'checkout', target: null }
}

export const clearDecisionCache = () => {
  decisionCache.clear()
}
