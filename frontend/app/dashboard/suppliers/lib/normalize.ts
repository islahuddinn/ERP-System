/**
 * Module-isolated normalization helper for Suppliers.
 */

export function ensureArray<T>(data: any): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data.data && Array.isArray(data.data)) {
        return data.data;
    }
    if (typeof data === 'object' && data !== null) {
        const potentialArray = Object.values(data).find(val => Array.isArray(val));
        if (Array.isArray(potentialArray)) return potentialArray as T[];
    }
    return [];
}
