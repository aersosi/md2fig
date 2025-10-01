import type { PageFormat, MarkdownElementConfig } from "./types/index.js";

export const PLUGIN_UI_DIMENSIONS = {
    width: 480,
    height: 480
} as const;

export const PAGE_FORMATS: Record<PageFormat, { width: number; height: number; unit: 'mm' | 'inch' }> = {
    a4: { width: 210, height: 297, unit: 'mm' },
    a3: { width: 297, height: 420, unit: 'mm' },
    letter: { width: 8.5, height: 11, unit: 'inch' },
    legal: { width: 8.5, height: 14, unit: 'inch' },
    tabloid: { width: 11, height: 17, unit: 'inch' }
};

export const FONT_FAMILIES: Array<{ name: string; weights: string[] }> = [
    { name: "Inter", weights: ["Regular", "Italic", "Bold", "Bold Italic"] }
];

export const MARKDOWN_ELEMENTS: Record<string, MarkdownElementConfig> = {
    'h1': { regex: /^#\s+(.*)$/, fontSize: 24, isBold: true, isItalic: false, marginTop: 10, marginBottom: 4 },
    'h2': { regex: /^##\s+(.*)$/, fontSize: 18, isBold: true, isItalic: false, marginTop: 9, marginBottom: 4 },
    'h3': { regex: /^###\s+(.*)$/, fontSize: 16, isBold: true, isItalic: false, marginTop: 8, marginBottom: 4 },
    'h4': { regex: /^####\s+(.*)$/, fontSize: 14, isBold: true, isItalic: false, marginTop: 7, marginBottom: 4 },
    'h5': { regex: /^#####\s+(.*)$/, fontSize: 12, isBold: true, isItalic: false, marginTop: 6, marginBottom: 4 },
    'h6': { regex: /^######\s+(.*)$/, fontSize: 10, isBold: true, isItalic: false, marginTop: 5, marginBottom: 4 },
    'list': {
        regex: /^[-*]\s+(.*)$/,
        fontSize: 10,
        isBold: false,
        isItalic: false,
        marginTop: 4,
        marginBottom: 4,
        prefix: '• '
    },
    'italic': { regex: /^[_*](.+?)[_*]$/, fontSize: 10, isBold: false, isItalic: true, marginTop: 2, marginBottom: 4 },
    'paragraph': { fontSize: 10, isBold: false, isItalic: false, marginTop: 2, marginBottom: 4 }
};
