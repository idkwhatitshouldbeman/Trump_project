// Serverless function for running simulations
// This can be used for Vercel/Netlify deployment

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { layout } = req.body

  if (!layout) {
    return res.status(400).json({ error: 'Layout is required' })
  }

  // For now, simulation runs client-side
  // This endpoint could be used for server-side simulation in the future
  // to offload computation from the client

  return res.status(200).json({
    message: 'Simulation should run client-side for now',
    layout: layout
  })
}
