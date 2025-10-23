/**
 * Performance Utilities
 * Provides caching, debouncing, and optimization utilities
 */

/**
 * Simple LRU Cache implementation
 */
export class LRUCache<K, V> {
    private cache: Map<K, V>;
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    /**
     * Get value from cache
     */
    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    /**
     * Set value in cache
     */
    set(key: K, value: V): void {
        // Remove if exists (to update position)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Add to end
        this.cache.set(key, value);

        // Evict oldest if over size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value as K;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    /**
     * Check if key exists in cache
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    waitMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return function debounced(...args: Parameters<T>) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, waitMs);
    };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limitMs: number
): (...args: Parameters<T>) => void {
    let lastRun = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return function throttled(...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastRun >= limitMs) {
            func(...args);
            lastRun = now;
        } else {
            // Schedule for later if not already scheduled
            if (timeoutId === null) {
                timeoutId = setTimeout(() => {
                    func(...args);
                    lastRun = Date.now();
                    timeoutId = null;
                }, limitMs - (now - lastRun));
            }
        }
    };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return function memoized(...args: Parameters<T>): ReturnType<T> {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func(...args);
        cache.set(key, result);
        return result;
    } as T;
}

/**
 * Chunk large arrays for processing
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
    for (let i = 0; i < array.length; i += chunkSize) {
        yield array.slice(i, i + chunkSize);
    }
}

/**
 * Process items in batches with delay between batches
 */
export async function processBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>,
    delayMs: number = 0
): Promise<R[]> {
    const results: R[] = [];

    for (const batch of chunkArray(items, batchSize)) {
        const batchResults = await processor(batch);
        results.push(...batchResults);

        if (delayMs > 0) {
            await sleep(delayMs);
        }
    }

    return results;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
    name: string,
    func: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    try {
        const result = await func();
        const duration = performance.now() - start;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        return result;
    } catch (error) {
        const duration = performance.now() - start;
        console.log(`[Performance] ${name} (failed): ${duration.toFixed(2)}ms`);
        throw error;
    }
}

/**
 * Optimize regex for large text search
 */
export function optimizeRegexSearch(
    text: string,
    pattern: string,
    caseSensitive: boolean = false
): Array<{ line: number; column: number; match: string; context: string }> {
    const results: Array<{ line: number; column: number; match: string; context: string }> = [];

    // Split text into lines once
    const lines = text.split('\n');

    // Create regex with appropriate flags
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(pattern, flags);

    // Process lines in chunks for large files
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const chunk = lines.slice(i, Math.min(i + CHUNK_SIZE, lines.length));

        chunk.forEach((line, chunkIndex) => {
            const lineIndex = i + chunkIndex;
            let match;

            // Reset regex lastIndex for each line
            regex.lastIndex = 0;

            while ((match = regex.exec(line)) !== null) {
                results.push({
                    line: lineIndex + 1,
                    column: match.index + 1,
                    match: match[0],
                    context: line
                });

                // Prevent infinite loop on zero-width matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        });
    }

    return results;
}

/**
 * Lazy iterator for file tree traversal
 */
export async function* lazyFileTreeIterator(
    dirHandle: FileSystemDirectoryHandle,
    maxDepth: number = 10,
    currentDepth: number = 0
): AsyncGenerator<{ path: string; type: 'file' | 'directory'; handle: FileSystemHandle }> {
    if (currentDepth >= maxDepth) {
        return;
    }

    for await (const entry of dirHandle.values()) {
        yield {
            path: entry.name,
            type: entry.kind,
            handle: entry
        };

        if (entry.kind === 'directory') {
            const subDirHandle = entry as FileSystemDirectoryHandle;
            for await (const subEntry of lazyFileTreeIterator(subDirHandle, maxDepth, currentDepth + 1)) {
                yield {
                    ...subEntry,
                    path: `${entry.name}/${subEntry.path}`
                };
            }
        }
    }
}

/**
 * Content size formatter
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
