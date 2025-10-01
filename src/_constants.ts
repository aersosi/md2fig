import type { MarkdownElementConfig, PageFormat } from "./types";

export const PLUGIN_UI_DIMENSIONS = {
    width: 480,
    height: 480
} as const;

export const PAGE_FORMATS: Record<PageFormat, { width: number; height: number; unit: 'mm' | 'inch' }> = {
    a4: {width: 210, height: 297, unit: 'mm'},
    a3: {width: 297, height: 420, unit: 'mm'},
    letter: {width: 8.5, height: 11, unit: 'inch'},
    legal: {width: 8.5, height: 14, unit: 'inch'},
    tabloid: {width: 11, height: 17, unit: 'inch'}
};

export const FONT_FAMILIES: Array<{ name: string; weights: string[] }> = [
    {name: "Inter", weights: ["Regular", "Italic", "Bold", "Bold Italic"]}
];

export const MARKDOWN_ELEMENTS: Record<string, MarkdownElementConfig> = {
    'h1': {fontSize: 24, style: 'bold', marginTop: 10, marginBottom: 4},
    'h2': {fontSize: 18, style: 'bold', marginTop: 9, marginBottom: 4},
    'h3': {fontSize: 16, style: 'bold', marginTop: 8, marginBottom: 4},
    'h4': {fontSize: 14, style: 'bold', marginTop: 7, marginBottom: 4},
    'h5': {fontSize: 12, style: 'bold', marginTop: 6, marginBottom: 4},
    'h6': {fontSize: 10, style: 'bold', marginTop: 5, marginBottom: 4},
    'list': {fontSize: 10, style: 'regular', marginTop: 4, marginBottom: 4, prefix: '• '},
    'paragraph': {fontSize: 10, style: 'regular', marginTop: 2, marginBottom: 4}
};
