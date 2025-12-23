// Serverless function for genetic algorithm optimization
// This can be used for Vercel/Netlify deployment

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { layout, generations, populationSize } = req.body

  if (!layout) {
    return res.status(400).json({ error: 'Layout is required' })
  }

  // For now, optimization runs client-side
  // This endpoint could be used for server-side optimization in the future
  // to offload heavy computation from the client

  return res.status(200).json({
    message: 'Optimization should run client-side for now',
    layout: layout
  })
}
