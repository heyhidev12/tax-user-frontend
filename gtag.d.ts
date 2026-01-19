// Type definitions for Google Analytics gtag.js
// This extends the Window interface to include the gtag function

interface Window {
    gtag?: (
        command: 'config' | 'set' | 'event' | 'consent',
        targetId: string,
        config?: Record<string, any>
    ) => void;
}
