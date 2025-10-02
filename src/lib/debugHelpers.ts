// Debug timing utilities
let startTime: number | null = null;

export function logTiming(event: string, details?: string): void {
    if (startTime === null) {
        startTime = Date.now();
        console.log(`0.000s : ${event}${details ? ` : ${details}` : ''}`);
    } else {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        console.log(`${elapsed}s : ${event}${details ? ` : ${details}` : ''}`);
    }
}

export function resetTimer(): void {
    startTime = null;
}
