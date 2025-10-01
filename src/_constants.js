export const PLUGIN_UI_DIMENSIONS = {
    width: 480,
    height: 480
}

export const PAGE_FORMATS = {
    a4:      { width: 210, height: 297, unit: 'mm' },
    a3:      { width: 297, height: 420, unit: 'mm' },
    letter:  { width: 8.5, height: 11, unit: 'inch' },
    legal:   { width: 8.5, height: 14, unit: 'inch' },
    tabloid: { width: 11, height: 17, unit: 'inch' }
};

export const FONT_FAMILY = "Inter"

export const FONT_FAMILIES = [
    {name: "Inter", weights: ["Regular", "Medium", "Semi Bold", "Bold"]},
    {name: "Slussen", weights: ["Regular", "Medium", "Semibold", "Bold"]},
];


// Markdown element configurations
export const MARKDOWN_ELEMENTS = {
    'h1': {regex: /^#\s+(.*)$/, fontSize: 24, isBold: true, marginTop: 10, marginBottom: 4},
    'h2': {regex: /^##\s+(.*)$/, fontSize: 18, isBold: true, marginTop: 10, marginBottom: 4},
    'h3': {regex: /^###\s+(.*)$/, fontSize: 14, isBold: true, marginTop: 8, marginBottom: 4},
    'h4': {regex: /^####\s+(.*)$/, fontSize: 12, isBold: true, marginTop: 6, marginBottom: 4},
    'list': {regex: /^[-*]\s+(.*)$/, fontSize: 10, isBold: false, marginTop: 4, marginBottom: 4, prefix: '• '},
    'paragraph': {fontSize: 10, isBold: false, marginTop: 2, marginBottom: 4}
};