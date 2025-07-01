export default defineEventHandler((event) => {
  // Add CORS headers
  setHeader(event, 'Access-Control-Allow-Origin', 'https://backend-squizzit.dreadex.dev')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})
