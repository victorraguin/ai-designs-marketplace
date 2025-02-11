// pages/api/gelatoCatalogs.js
export default async function handler (req, res) {
  try {
    const response = await fetch('https://product.gelatoapis.com/v3/catalogs', {
      headers: {
        'X-API-KEY': process.env.GELATO_API_KEY || 'mock-key',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return res.status(response.status).json({ error: errorData.message })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching Gelato catalogs:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
