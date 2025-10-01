// Helper functions for parsing different formatting types
import { MARKDOWN_ELEMENTS, PAGE_FORMATS } from "./_constants.js";
import markdownit from 'markdown-it';
import markdownItMark from 'markdown-it-mark';
import type Token from 'markdown-it/lib/token.mjs';

import type { PageFormat, MarkdownBlock, InlinePart, PageDimensions } from "./types";

// Initialize markdown-it parser
const md = markdownit({
    html: true,         // Allow HTML for underline support
    linkify: true,      // Auto-convert URLs to links
    breaks: false,      // Don't convert \n to <br>
    typographer: false  // No typographic replacements
})
.enable('strikethrough')
.use(markdownItMark);

// markdown-it based parsing functions
export function parseMarkdownToBlocks(markdown: string): MarkdownBlock[] {
    const tokens = md.parse(markdown, {});
    console.log('🔍 Raw tokens from markdown-it:', JSON.stringify(tokens.map(t => ({ type: t.type, tag: t.tag, content: t.content })), null, 2));
    const blocks: MarkdownBlock[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        switch(token.type) {
            case 'heading_open':
                const level = token.tag; // 'h1', 'h2', etc.
                const headingContent = tokens[i + 1]; // next token is inline content
                blocks.push({
                    type: level,
                    content: headingContent.content || '',
                    config: MARKDOWN_ELEMENTS[level],
                    inlineTokens: headingContent.children || undefined,
                    items: []
                });
                i += 2; // skip content + closing tag
                break;

            case 'paragraph_open':
                const paraContent = tokens[i + 1];
                blocks.push({
                    type: 'paragraph',
                    content: paraContent.content || '',
                    config: MARKDOWN_ELEMENTS.paragraph,
                    inlineTokens: paraContent.children || undefined,
                    items: []
                });
                i += 2;
                break;

            case 'bullet_list_open':
            case 'ordered_list_open':
                const listItems = [];
                const isOrdered = token.type === 'ordered_list_open';
                const closeType = isOrdered ? 'ordered_list_close' : 'bullet_list_close';
                let minLevel = Infinity;

                // First pass: find minimum level
                let tempI = i + 1;
                while (tokens[tempI] && tokens[tempI].type !== closeType) {
                    if (tokens[tempI].type === 'list_item_open') {
                        minLevel = Math.min(minLevel, tokens[tempI].level || 0);
                    }
                    tempI++;
                }

                // Second pass: collect items with normalized levels
                i++; // move to first list_item
                while (tokens[i] && tokens[i].type !== closeType) {
                    if (tokens[i].type === 'list_item_open') {
                        const itemLevel = (tokens[i].level || 0) - minLevel;
                        // Find the paragraph content inside list item
                        let j = i + 1;
                        while (j < tokens.length && tokens[j].type !== 'list_item_close') {
                            if (tokens[j].type === 'paragraph_open' || tokens[j].type === 'inline') {
                                const itemContent = tokens[j].type === 'inline' ? tokens[j] : tokens[j + 1];
                                listItems.push({
                                    content: itemContent.content,
                                    inlineTokens: itemContent.children || [],
                                    level: itemLevel
                                });
                                break;
                            }
                            j++;
                        }
                    }
                    i++;
                }
                blocks.push({
                    type: 'list',
                    content: '',
                    ordered: isOrdered,
                    items: listItems,
                    config: MARKDOWN_ELEMENTS.list
                });
                break;

            case 'hr':
                blocks.push({ type: 'empty', content: '', items: [] });
                break;
        }
    }

    return blocks;
}

export function parseInlineTokens(inlineTokens: Token[] | undefined): InlinePart[] {
    if (!inlineTokens || inlineTokens.length === 0) {
        return [{ text: '', bold: false, italic: false, link: null, strikethrough: false, underline: false, highlight: false }];
    }

    const parts: InlinePart[] = [];

    function walk(tokens: Token[], context?: { bold: boolean; italic: boolean; link: string | null; strikethrough: boolean; underline: boolean; highlight: boolean }) {
        if (!context) {
            context = { bold: false, italic: false, link: null, strikethrough: false, underline: false, highlight: false };
        }

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token.type === 'text') {
                parts.push({
                    text: token.content,
                    bold: context.bold,
                    italic: context.italic,
                    link: context.link,
                    strikethrough: context.strikethrough,
                    underline: context.underline,
                    highlight: context.highlight
                });
            } else if (token.type === 'strong_open') {
                // Find matching close and walk children
                let depth = 1;
                let j = i + 1;
                const children = [];
                while (j < tokens.length && depth > 0) {
                    if (tokens[j].type === 'strong_open') depth++;
                    else if (tokens[j].type === 'strong_close') depth--;
                    if (depth > 0) children.push(tokens[j]);
                    j++;
                }
                const newContext = {
                    bold: true,
                    italic: context.italic,
                    link: context.link,
                    strikethrough: context.strikethrough,
                    underline: context.underline,
                    highlight: context.highlight
                };
                walk(children, newContext);
                i = j - 1; // Skip to closing tag
            } else if (token.type === 'em_open') {
                // Find matching close and walk children
                let depth = 1;
                let j = i + 1;
                const children = [];
                while (j < tokens.length && depth > 0) {
                    if (tokens[j].type === 'em_open') depth++;
                    else if (tokens[j].type === 'em_close') depth--;
                    if (depth > 0) children.push(tokens[j]);
                    j++;
                }
                const newContext = {
                    bold: context.bold,
                    italic: true,
                    link: context.link,
                    strikethrough: context.strikethrough,
                    underline: context.underline,
                    highlight: context.highlight
                };
                walk(children, newContext);
                i = j - 1;
            } else if (token.type === 's_open') {
                // Strikethrough support
                let depth = 1;
                let j = i + 1;
                const children = [];
                while (j < tokens.length && depth > 0) {
                    if (tokens[j].type === 's_open') depth++;
                    else if (tokens[j].type === 's_close') depth--;
                    if (depth > 0) children.push(tokens[j]);
                    j++;
                }
                const newContext = {
                    bold: context.bold,
                    italic: context.italic,
                    link: context.link,
                    strikethrough: true,
                    underline: context.underline,
                    highlight: context.highlight
                };
                walk(children, newContext);
                i = j - 1;
            } else if (token.type === 'link_open') {
                // Find href and walk children
                const href = token.attrGet('href');
                let depth = 1;
                let j = i + 1;
                const children = [];
                while (j < tokens.length && depth > 0) {
                    if (tokens[j].type === 'link_open') depth++;
                    else if (tokens[j].type === 'link_close') depth--;
                    if (depth > 0) children.push(tokens[j]);
                    j++;
                }
                const newContext = {
                    bold: context.bold,
                    italic: context.italic,
                    link: href,
                    strikethrough: context.strikethrough,
                    underline: true,
                    highlight: context.highlight
                };
                walk(children, newContext);
                i = j - 1;
            } else if (token.type === 'mark_open') {
                // Highlight support (==text==)
                let depth = 1;
                let j = i + 1;
                const children = [];
                while (j < tokens.length && depth > 0) {
                    if (tokens[j].type === 'mark_open') depth++;
                    else if (tokens[j].type === 'mark_close') depth--;
                    if (depth > 0) children.push(tokens[j]);
                    j++;
                }
                const newContext = {
                    bold: context.bold,
                    italic: context.italic,
                    link: context.link,
                    strikethrough: context.strikethrough,
                    underline: context.underline,
                    highlight: true
                };
                walk(children, newContext);
                i = j - 1;
            } else if (token.type === 'html_inline') {
                // Handle HTML inline tags for underline
                const htmlContent = token.content;
                if (htmlContent === '<u>' || htmlContent === '<ins>') {
                    // Find matching closing tag
                    const closeTag = htmlContent === '<u>' ? '</u>' : '</ins>';
                    let j = i + 1;
                    const children = [];
                    while (j < tokens.length) {
                        if (tokens[j].type === 'html_inline' && tokens[j].content === closeTag) {
                            break;
                        }
                        children.push(tokens[j]);
                        j++;
                    }
                    const newContext = {
                        bold: context.bold,
                        italic: context.italic,
                        link: context.link,
                        strikethrough: context.strikethrough,
                        underline: true,
                        highlight: context.highlight
                    };
                    walk(children, newContext);
                    i = j; // Skip to closing tag
                }
            } else if (token.type === 'code_inline') {
                parts.push({
                    text: token.content,
                    bold: context.bold,
                    italic: context.italic,
                    link: context.link,
                    strikethrough: context.strikethrough,
                    underline: context.underline,
                    highlight: context.highlight
                });
            }
        }
    }

    walk(inlineTokens);
    return parts.length > 0 ? parts : [{ text: '', bold: false, italic: false, link: null, strikethrough: false, underline: false, highlight: false }];
}

export function toInches(value: number, unit: 'mm' | 'inch'): number {
    const MM_TO_INCH = 1 / 25.4;
    return unit === 'mm' ? value * MM_TO_INCH : value;
}

// Function to calculate dimensions based on DPI, page format, and padding
export function getPageDimensions(dpi: number = 96, pageFormat: PageFormat = 'letter', padding: number = 5): PageDimensions {
    const format = PAGE_FORMATS[pageFormat] || PAGE_FORMATS.letter;

    const widthIn = toInches(format.width, format.unit);
    const heightIn = toInches(format.height, format.unit);

    const PAGE_WIDTH = widthIn * dpi;
    const PAGE_HEIGHT = heightIn * dpi;
    const PADDING = (padding / 100) * Math.min(PAGE_WIDTH, PAGE_HEIGHT); // Padding as percentage of smallest dimension
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * PADDING;
    const PAGE_GAP = 24; // Gap between pages

    return {
        PAGE_WIDTH,
        PAGE_HEIGHT,
        PADDING,
        CONTENT_WIDTH,
        PAGE_GAP
    };
}