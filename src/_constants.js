export const PLUGIN_UI_WIDTH = 400;
export const PLUGIN_UI_HEIGHT = 500;

// Function to calculate dimensions based on DPI
export function getPageDimensions(dpi = 96) {
    const PAGE_WIDTH = 8.5 * dpi; // Standard US Letter width (inch) in pixels
    const PAGE_HEIGHT = 11 * dpi; // Standard US Letter height (inch) in pixels
    const MARGIN = 0.5 * dpi; // Half-inch margin in pixels
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    const PAGE_GAP = 20; // Gap between pages

    return {
        PAGE_WIDTH,
        PAGE_HEIGHT,
        MARGIN,
        CONTENT_WIDTH,
        PAGE_GAP
    };
}

export const FONT_FAMILY = "Inter"