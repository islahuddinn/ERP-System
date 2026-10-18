/**
 * Module-isolated normalization helper for Quality Control.
 * Strictly limited to this dashboard section to avoid global side-effects.
 */

export function ensureArray<T>(data: any): T[] {
    if (!data) return [];

    // Case 1: Already an array
    if (Array.isArray(data)) return data;

    // Case 2: Standard API envelope { data: [], meta: {} }
    if (typeof data === 'object' && data.data && Array.isArray(data.data)) {
        return data.data;
    }

    // Case 3: Deep probe for any array property (failsafe)
    if (typeof data === 'object' && data !== null) {
        // Specifically look for fields like 'inspections', 'plants', etc.
        const potentialArray = Object.values(data).find(val => Array.isArray(val));
        if (Array.isArray(potentialArray)) return potentialArray as T[];
    }

    // Fallback: Default to empty array to prevent .map() crashes
    return [];
}
