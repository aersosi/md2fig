// Helper functions for parsing different formatting types
import { MARKDOWN_ELEMENTS, PAGE_FORMATS } from "./_constants.js";

export function parseMarkdownLine(line) {
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

const INLINE_FORMATTERS = {
    bold: {
        regex: /\*\*(.*?)\*\*/,
        createPart: (match) => ({ text: match[1], bold: true }),
    },
    link: {
        regex: /\[(.*?)\]\((.*?)\)/,
        createPart: (match) => ({ text: match[1], link: match[2] }),
    },
    medium: {
        regex: /\*([^*]+)\*/,
        createPart: (match) => ({ text: match[1], medium: true }),
    },
};

export function parseFormattedText(text) {
    const parts = [];
    let currentIndex = 0;

    // 1. Baue den Master-Regex dynamisch zusammen
    const formatterNames = Object.keys(INLINE_FORMATTERS);
    const masterRegex = new RegExp(
        Object.values(INLINE_FORMATTERS)
            .map((config) => '(' + config.regex.source + ')')
            .join('|'),
        'g'
    );

    let match;
    while ((match = masterRegex.exec(text)) !== null) {
        // Text vor dem Match hinzufügen
        if (match.index > currentIndex) {
            parts.push({ text: text.slice(currentIndex, match.index) });
        }

        // 2. Finde heraus, welcher Formatter den Treffer verursacht hat
        let formatterName = null;
        for (let i = 0; i < formatterNames.length; i++) {
            if (match[i + 1] !== undefined) {
                formatterName = formatterNames[i];
                break;
            }
        }

        if (formatterName) {
            const config = INLINE_FORMATTERS[formatterName];

            // 3. Matche den Treffer erneut mit dem spezifischen Regex
            const subMatch = match[0].match(config.regex);

            // 4. Erstelle das formatierte Teil (mit Fallback bei null)
            if (subMatch) {
                parts.push(config.createPart(subMatch));
            } else {
                // Fallback: füge den Text unformatiert hinzu
                parts.push({ text: match[0] });
            }
        } else {
            // Fallback: füge den Text unformatiert hinzu
            parts.push({ text: match[0] });
        }

        currentIndex = masterRegex.lastIndex;
    }

    // Restlichen Text am Ende hinzufügen
    if (currentIndex < text.length) {
        parts.push({ text: text.slice(currentIndex) });
    }

    // Füge allen Teilen Standardwerte hinzu
    return parts.map(function(part) {
        return Object.assign({
            bold: false,
            medium: false,
            link: null
        }, part);
    });
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