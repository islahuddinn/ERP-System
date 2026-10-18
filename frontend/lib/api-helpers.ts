import { ApiResponse, PaginatedResponse } from "@/types/common"

// Helper utilities for handling API responses with different formats

/**
 * Extracts data array from various response formats
 * Handles both direct arrays and paginated responses
 */
export function extractDataArray<T>(data: ApiResponse<T> | undefined): T[] {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data && 'data' in data && Array.isArray(data.data)) return data.data
    return []
}

/**
 * Extracts product array from various response formats (backward compatibility)
 */
export function extractProductsArray<T>(data: ApiResponse<T> | undefined): T[] {
    return extractDataArray(data)
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(data: ApiResponse<T> | undefined): data is PaginatedResponse<T> {
    return !!(data && typeof data === 'object' && 'data' in data && 'meta' in data)
}

/**
 * Safely access data property with fallback
 */
export function getDataOrSelf<T>(response: ApiResponse<T> | undefined): T[] {
    return extractDataArray(response)
}
