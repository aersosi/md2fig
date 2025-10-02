/// <reference types="@figma/plugin-typings" />

declare const __html__: string;

// Console for logging (available in Figma plugin environment)
declare const console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
};

declare module 'markdown-it-mark';
declare module 'markdown-it-sub';
declare module 'markdown-it-sup';