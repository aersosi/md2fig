import type Token from 'markdown-it/lib/token.mjs';

export type PageFormat = 'a4' | 'a3' | 'letter' | 'legal' | 'tabloid';

export type FontStyle = 'regular' | 'bold' | 'italic' | 'bold-italic';

export interface MarkdownElementConfig {
    fontSize: number;
    style: FontStyle;
    marginTop: number;
    marginBottom: number;
    prefix?: string;
}

export interface MarkdownBlock {
    type: string;
    content: string;
    config?: MarkdownElementConfig;
    inlineTokens?: Token[];
    items: Array<{ content: string; inlineTokens: Token[]; level: number }>;
    ordered?: boolean;
}

export interface InlinePart {
    text: string;
    bold: boolean;
    italic: boolean;
    link: string | null;
    strikethrough: boolean;
    underline: boolean;
    highlight: boolean;
}

export interface PageDimensions {
    PAGE_WIDTH: number;
    PAGE_HEIGHT: number;
    PADDING: number;
    CONTENT_WIDTH: number;
    PAGE_GAP: number;
}

export interface PluginMessage {
    type: string;
    dpi?: number;
    pageFormat?: string;
    padding?: number;
    markdown?: string;
}
