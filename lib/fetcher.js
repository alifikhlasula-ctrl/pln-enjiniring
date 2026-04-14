/**
 * lib/fetcher.js
 * Standard fetcher for SWR. Takes a URL, fetches it, and returns JSON.
 * Throws an error object if the response is not OK (for SWR error handling).
 */
export const fetcher = async (url) => {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    error.info = await res.json().catch(() => ({}))
    error.status = res.status
    throw error
  }
  
  return res.json()
}
