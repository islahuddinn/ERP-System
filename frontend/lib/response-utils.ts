/**
 * Utility functions to handle API responses that may be wrapped by ResponseInterceptor
 * 
 * The backend ResponseInterceptor wraps responses in:
 * { success: boolean, message: string, data: any }
 * 
 * This utility helps extract the actual data consistently across the frontend.
 */

/**
 * Extracts an array from a potentially wrapped API response
 * Handles multiple response formats:
 * - Wrapped: { success, message, data: { data: [...], meta: {...} } }
 * - Direct: { data: [...], meta: {...} }
 * - Array: [...]
 * 
 * @param responseData - The response data from apiClient
 * @returns An array, or empty array if not found
 */
export function extractArrayFromResponse<T = any>(responseData: any): T[] {
  if (!responseData) return []
  
  // If it's already an array, return it
  if (Array.isArray(responseData)) {
    return responseData
  }
  
  // If it's an object with a 'data' property
  if (typeof responseData === 'object' && 'data' in responseData) {
    // Check if data is an array (direct response)
    if (Array.isArray(responseData.data)) {
      return responseData.data
    }
    
    // Check if data.data is an array (wrapped response)
    if (typeof responseData.data === 'object' && 'data' in responseData.data && Array.isArray(responseData.data.data)) {
      return responseData.data.data
    }
  }
  
  return []
}

/**
 * Extracts paginated data from a potentially wrapped API response
 * Returns both the data array and metadata
 * 
 * @param responseData - The response data from apiClient
 * @returns Object with data array and meta object
 */
export function extractPaginatedDataFromResponse<T = any>(responseData: any): {
  data: T[]
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
} {
  if (!responseData) {
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
  }
  
  // If it's already an array, return it with empty meta
  if (Array.isArray(responseData)) {
    return { data: responseData, meta: { total: responseData.length, page: 1, limit: responseData.length, totalPages: 1 } }
  }
  
  // If it's an object with a 'data' property
  if (typeof responseData === 'object' && 'data' in responseData) {
    // Check if data is an object with data and meta (direct response)
    if (typeof responseData.data === 'object' && 'data' in responseData.data) {
      return {
        data: Array.isArray(responseData.data.data) ? responseData.data.data : [],
        meta: responseData.data.meta || {}
      }
    }
    
    // Check if data is an array (direct response)
    if (Array.isArray(responseData.data)) {
      return {
        data: responseData.data,
        meta: responseData.meta || {}
      }
    }
    
    // Check if it's wrapped: { success, message, data: { data: [...], meta: {...} } }
    if (typeof responseData.data === 'object' && 'data' in responseData.data) {
      return {
        data: Array.isArray(responseData.data.data) ? responseData.data.data : [],
        meta: responseData.data.meta || {}
      }
    }
  }
  
  return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
}

/**
 * Extracts a single object from a potentially wrapped API response
 * 
 * @param responseData - The response data from apiClient
 * @returns The object, or null if not found
 */
export function extractObjectFromResponse<T = any>(responseData: any): T | null {
  if (!responseData) return null
  
  // If it's already an object (not array), return it
  if (typeof responseData === 'object' && !Array.isArray(responseData)) {
    // If it has a 'data' property, extract it
    if ('data' in responseData) {
      // Check if data.data exists (wrapped response)
      if (typeof responseData.data === 'object' && 'data' in responseData.data) {
        return responseData.data.data
      }
      return responseData.data
    }
    return responseData
  }
  
  return null
}

/**
 * Unwraps a response from ResponseInterceptor
 * Handles: { success, message, data: any }
 * 
 * @param responseData - The response data from apiClient
 * @returns The unwrapped data
 */
export function unwrapResponse(responseData: any): any {
  if (!responseData) return null
  
  // If it's wrapped by ResponseInterceptor
  if (typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
    return responseData.data
  }
  
  return responseData
}

