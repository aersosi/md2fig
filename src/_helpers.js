// Helper functions for parsing different formatting types
import { MARKDOWN_ELEMENTS, PAGE_FORMATS } from "./_constants.js";

export function paseLine(line) {
    if (line.trim() === "") return {type: 'empty'};

    // Check for standalone links (entire line is a link)
    const linkMatch = line.match(/^\[.*?\]\(.*?\)$/);
    if (linkMatch) {
        return {type: 'link', content: line};
    }

    for (const [type, config] of Object.entries(MARKDOWN_ELEMENTS)) {
        if (!config.regex) continue; // Skip elements without regex (like paragraph)
        const match = line.match(config.regex);
        if (match) {
            const content = type === 'list' ? config.prefix + match[1] : match[1];
            return {type, content, config};
        }
    }

    return {type: 'paragraph', content: line};
}

export function paseSubstring(text) {
    const parts = [];
    let currentIndex = 0;

    // Combined regex that matches all inline formatting
    // Order matters: links first (most specific), then bold, then italic
    const regex = /(\[.+?\]\(.+?\))|(\*\*[^*]+?\*\*)|(_[^_]+?_)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > currentIndex) {
            parts.push({ text: text.slice(currentIndex, match.index) });
        }

        const fullMatch = match[0];

        // Check which pattern matched
        if (match[1]) {
            // Link: [text](url)
            const linkMatch = fullMatch.match(/\[(.+?)\]\((.+?)\)/);
            if (linkMatch) {
                parts.push({ text: linkMatch[1], bold: false, italic: false, link: linkMatch[2] });
            }
        } else if (match[2]) {
            // Bold: **text**
            const boldMatch = fullMatch.match(/\*\*([^*]+?)\*\*/);
            if (boldMatch) {
                parts.push({ text: boldMatch[1], bold: true, italic: false, link: null });
            }
        } else if (match[3]) {
            // Italic: _text_
            const italicMatch = fullMatch.match(/_([^_]+?)_/);
            if (italicMatch) {
                parts.push({ text: italicMatch[1], bold: false, italic: true, link: null });
            }
        }

        currentIndex = regex.lastIndex;
    }

    // Add remaining text
    if (currentIndex < text.length) {
        parts.push({ text: text.slice(currentIndex), bold: false, italic: false, link: null });
    }

    return parts;
}


const MM_TO_INCH = 1 / 25.4;

export function toInches(value, unit) {
    return unit === 'mm' ? value * MM_TO_INCH : value;
}

// Function to calculate dimensions based on DPI, page format, and padding
export function getPageDimensions(dpi = 96, pageFormat = 'letter', padding = 5) {
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