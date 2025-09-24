export const PLUGIN_UI_WIDTH = 480;
export const PLUGIN_UI_HEIGHT = 480;

// Page format definitions (width x height in inches)
const PAGE_FORMATS = {
    a4: { width: 8.27, height: 11.69 }, // 210 × 297 mm
    a3: { width: 11.69, height: 16.54 },  // 297 × 420 mm
    letter: { width: 8.5, height: 11 },   // US Letter
    legal: { width: 8.5, height: 14 },    // US Legal
    tabloid: { width: 11, height: 17 }    // Tabloid
};

// Function to calculate dimensions based on DPI, page format, and padding
export function getPageDimensions(dpi = 96, pageFormat = 'letter', padding = 5) {
    const format = PAGE_FORMATS[pageFormat] || PAGE_FORMATS.letter;

    const PAGE_WIDTH = format.width * dpi;
    const PAGE_HEIGHT = format.height * dpi;
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

export const FONT_FAMILY = "Inter"