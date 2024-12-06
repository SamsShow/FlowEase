import { Buffer } from 'buffer';

// Initialize Buffer globally
globalThis.Buffer = Buffer;
global = globalThis;

// Ensure process is available
if (typeof process === 'undefined') {
    globalThis.process = { env: {} };
}

// Initialize all required globals
const initGlobals = () => {
    // Ensure Buffer is available in all contexts
    if (typeof window !== 'undefined') {
        window.Buffer = Buffer;
    }
    if (typeof global !== 'undefined') {
        global.Buffer = Buffer;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.Buffer = Buffer;
    }
};

initGlobals();

export const initPolyfills = () => {
    initGlobals();
    console.log('Polyfills initialized', {
        hasBuffer: typeof Buffer !== 'undefined',
        hasGlobal: typeof global !== 'undefined',
        hasProcess: typeof process !== 'undefined',
        windowBuffer: typeof window !== 'undefined' && typeof window.Buffer !== 'undefined',
        globalBuffer: typeof global !== 'undefined' && typeof global.Buffer !== 'undefined'
    });
}; 