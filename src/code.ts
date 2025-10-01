import { FONT_FAMILIES, MARKDOWN_ELEMENTS, PLUGIN_UI_DIMENSIONS, COLOR_HEX } from "./_constants.js";
import { getPageDimensions, parseMarkdownToBlocks, parseInlineTokens } from "./_helpers.js";
import type { PageDimensions, PluginMessage, PageFormat } from "./types";
import type Token from 'markdown-it/lib/token.mjs';

// Alias for more concise code
const rgb = figma.util.rgb;

// Helper function to check if URL is absolute
function isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

figma.showUI(__html__, {width: PLUGIN_UI_DIMENSIONS.width, height: PLUGIN_UI_DIMENSIONS.height});

class PageBuilder {
    dimensions: PageDimensions;
    yOffset: number;
    pageNumber: number;
    xPosition: number;
    currentPage: FrameNode;
    allPages: FrameNode[];
    fontsLoaded: boolean;
    highlightColor: string;
    linkColor: string;

    constructor(dimensions: PageDimensions, highlightColor: string = COLOR_HEX.HIGHLIGHT, linkColor: string = COLOR_HEX.LINK) {
        this.dimensions = dimensions;
        this.yOffset = dimensions.PADDING;
        this.pageNumber = 1;
        this.xPosition = 0;
        this.currentPage = this.createNewPage();
        this.allPages = [this.currentPage];
        this.fontsLoaded = false;
        this.highlightColor = highlightColor;
        this.linkColor = linkColor;
    }


    async loadFonts(): Promise<void> {
        if (this.fontsLoaded) return;

        const fontPromises: Promise<void>[] = [];
        for (const font of FONT_FAMILIES) {
            for (const weight of font.weights) {
                fontPromises.push(
                    (async () => {
                        try {
                            await figma.loadFontAsync({family: font.name, style: weight});
                        } catch (error) {
                            console.warn(error);
                        }
                    })()
                );
            }
        }

        await Promise.all(fontPromises);

        this.fontsLoaded = true;
    }

    createNewPage(): FrameNode {
        const page = figma.createFrame();
        page.resize(this.dimensions.PAGE_WIDTH, this.dimensions.PAGE_HEIGHT);
        page.x = this.xPosition;
        page.y = 0;
        page.fills = [{type: "SOLID", color: rgb(COLOR_HEX.PAGE_BACKGROUND)}];
        page.name = `Page ${this.pageNumber}`;
        return page;
    }

    checkAndCreateNewPage(textHeight: number): boolean {
        if (this.yOffset + textHeight + this.dimensions.PADDING > this.dimensions.PAGE_HEIGHT) {
            this.pageNumber += 1;
            this.xPosition += this.dimensions.PAGE_WIDTH + this.dimensions.PAGE_GAP;
            this.currentPage = this.createNewPage();
            this.allPages.push(this.currentPage);
            this.yOffset = this.dimensions.PADDING;
            return true;
        }
        return false;
    }

    async createFormattedTextNode(content: string, fontSize: number, isBold: boolean, isItalic: boolean, inlineTokens?: Token[]): Promise<TextNode> {
        const textNode = figma.createText();
        textNode.fontSize = fontSize;
        textNode.x = this.dimensions.PADDING;
        textNode.y = this.yOffset;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";

        const parts = inlineTokens ? parseInlineTokens(inlineTokens) : [{ text: content, bold: false, italic: false, link: null, strikethrough: false, underline: false, highlight: false, subscript: false, superscript: false }];
        let currentIndex = 0;
        let linkParts = [];
        let highlightParts = [];

        // First pass: insert text and apply basic formatting
        for (const part of parts) {
            if (part.text.length === 0) continue;

            textNode.insertCharacters(currentIndex, part.text);

            let fontStyle = "Regular";
            const effectiveBold = part.bold || isBold;
            const effectiveItalic = part.italic || isItalic;

            if (effectiveBold && effectiveItalic) {
                fontStyle = "Bold Italic";
            } else if (effectiveBold) {
                fontStyle = "Bold";
            } else if (effectiveItalic) {
                fontStyle = "Italic";
            }

            textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
                family: FONT_FAMILIES[0].name,
                style: fontStyle,
            });

            // Apply subscript/superscript by reducing font size
            if (part.subscript || part.superscript) {
                const reducedSize = Math.round(fontSize * 0.7);
                textNode.setRangeFontSize(currentIndex, currentIndex + part.text.length, reducedSize);
            }

            // Apply text decoration (underline or strikethrough)
            if (part.strikethrough && part.underline) {
                // Figma doesn't support both, prioritize strikethrough
                textNode.setRangeTextDecoration(currentIndex, currentIndex + part.text.length, "STRIKETHROUGH");
            } else if (part.strikethrough) {
                textNode.setRangeTextDecoration(currentIndex, currentIndex + part.text.length, "STRIKETHROUGH");
            } else if (part.underline) {
                textNode.setRangeTextDecoration(currentIndex, currentIndex + part.text.length, "UNDERLINE");
            }

            // Store highlight info for later processing
            if (part.highlight) {
                highlightParts.push({
                    startIndex: currentIndex,
                    endIndex: currentIndex + part.text.length
                });
            }

            // Store link info for later processing
            if (part.link) {
                linkParts.push({
                    startIndex: currentIndex,
                    endIndex: currentIndex + part.text.length,
                    url: part.link,
                    text: part.text
                });
            }

            currentIndex += part.text.length;
        }

        // Second pass: apply highlights
        for (const highlightPart of highlightParts) {
            textNode.setRangeFills(highlightPart.startIndex, highlightPart.endIndex, [{
                type: "SOLID",
                color: rgb(this.highlightColor)
            }]);
        }

        // Third pass: apply hyperlinks after all text is inserted
        for (const linkPart of linkParts) {
            if (isAbsoluteUrl(linkPart.url)) {
                textNode.setRangeHyperlink(linkPart.startIndex, linkPart.endIndex, {
                    type: "URL",
                    value: linkPart.url
                });
                textNode.setRangeFills(linkPart.startIndex, linkPart.endIndex, [{
                    type: "SOLID",
                    color: rgb(this.linkColor)
                }]);
            }
        }

        if (textNode.width > this.dimensions.CONTENT_WIDTH) {
            textNode.textAutoResize = "HEIGHT";
            textNode.resize(this.dimensions.CONTENT_WIDTH, textNode.height);
        }

        return textNode;
    }

    async addTextElement(content: string, config: any, inlineTokens?: Token[]): Promise<void> {
        this.yOffset += config.marginTop;

        const isBold = config.style === 'bold' || config.style === 'bold-italic';
        const isItalic = config.style === 'italic' || config.style === 'bold-italic';
        const textNode = await this.createFormattedTextNode(content, config.fontSize, isBold, isItalic, inlineTokens);

        // Check if we need a new page and update position if so
        const newPage = this.checkAndCreateNewPage(textNode.height);
        if (newPage) {
            textNode.x = this.dimensions.PADDING;
            textNode.y = this.yOffset;
        }

        this.currentPage.appendChild(textNode);
        this.yOffset += textNode.height + config.marginBottom;
    }

    async addListElement(items: Array<{ content: string; inlineTokens: Token[], level: number }>, config: any): Promise<void> {
        this.yOffset += config.marginTop;

        const textNode = figma.createText();
        textNode.fontSize = config.fontSize;
        textNode.x = this.dimensions.PADDING;
        textNode.y = this.yOffset;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";

        const isBold = config.style === 'bold' || config.style === 'bold-italic';
        const isItalic = config.style === 'italic' || config.style === 'bold-italic';

        let currentIndex = 0;
        let linkParts = [];
        let highlightParts = [];
        let indentRanges = [];

        // Process each list item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const prefix = MARKDOWN_ELEMENTS.list.prefix || '• ';

            // Insert prefix only (no spaces for indentation)
            textNode.insertCharacters(currentIndex, prefix);
            const prefixLength = prefix.length;
            textNode.setRangeFontName(currentIndex, currentIndex + prefixLength, {
                family: FONT_FAMILIES[0].name,
                style: isBold ? "Bold" : "Regular",
            });

            // Store line start position and indent level for later
            const lineStart = currentIndex;
            currentIndex += prefixLength;

            // Process inline tokens for this item
            const parts = parseInlineTokens(item.inlineTokens);
            for (const part of parts) {
                if (part.text.length === 0) continue;

                textNode.insertCharacters(currentIndex, part.text);

                let fontStyle = "Regular";
                const effectiveBold = part.bold || isBold;
                const effectiveItalic = part.italic || isItalic;

                if (effectiveBold && effectiveItalic) {
                    fontStyle = "Bold Italic";
                } else if (effectiveBold) {
                    fontStyle = "Bold";
                } else if (effectiveItalic) {
                    fontStyle = "Italic";
                }

                textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
                    family: FONT_FAMILIES[0].name,
                    style: fontStyle,
                });

                // Apply subscript/superscript by reducing font size
                if (part.subscript || part.superscript) {
                    const reducedSize = Math.round(config.fontSize * 0.7);
                    textNode.setRangeFontSize(currentIndex, currentIndex + part.text.length, reducedSize);
                }

                // Apply text decoration
                if (part.strikethrough) {
                    textNode.setRangeTextDecoration(currentIndex, currentIndex + part.text.length, "STRIKETHROUGH");
                } else if (part.underline) {
                    textNode.setRangeTextDecoration(currentIndex, currentIndex + part.text.length, "UNDERLINE");
                }

                if (part.highlight) {
                    highlightParts.push({
                        startIndex: currentIndex,
                        endIndex: currentIndex + part.text.length
                    });
                }

                if (part.link) {
                    linkParts.push({
                        startIndex: currentIndex,
                        endIndex: currentIndex + part.text.length,
                        url: part.link
                    });
                }

                currentIndex += part.text.length;
            }

            // Add newline between items (except for last item)
            if (i < items.length - 1) {
                textNode.insertCharacters(currentIndex, '\n');
                currentIndex += 1;
            }

            // Store indent info for this line
            indentRanges.push({
                lineStart: lineStart,
                level: item.level
            });
        }

        // Apply paragraph indents for nested list items
        const subitemIndent = config.subitemIndent || 16;
        for (const indentRange of indentRanges) {
            if (indentRange.level > 0) {
                const indentAmount = indentRange.level * subitemIndent;
                textNode.setRangeParagraphIndent(indentRange.lineStart, indentRange.lineStart + 1, indentAmount);
            }
        }

        // Apply highlights
        for (const highlightPart of highlightParts) {
            textNode.setRangeFills(highlightPart.startIndex, highlightPart.endIndex, [{
                type: "SOLID",
                color: rgb(this.highlightColor)
            }]);
        }

        // Apply hyperlinks
        for (const linkPart of linkParts) {
            if (isAbsoluteUrl(linkPart.url)) {
                textNode.setRangeHyperlink(linkPart.startIndex, linkPart.endIndex, {
                    type: "URL",
                    value: linkPart.url
                });
                textNode.setRangeFills(linkPart.startIndex, linkPart.endIndex, [{
                    type: "SOLID",
                    color: rgb(this.linkColor)
                }]);
            }
        }

        if (textNode.width > this.dimensions.CONTENT_WIDTH) {
            textNode.textAutoResize = "HEIGHT";
            textNode.resize(this.dimensions.CONTENT_WIDTH, textNode.height);
        }

        // Check if we need a new page
        const newPage = this.checkAndCreateNewPage(textNode.height);
        if (newPage) {
            textNode.x = this.dimensions.PADDING;
            textNode.y = this.yOffset;
        }

        this.currentPage.appendChild(textNode);
        this.yOffset += textNode.height + config.marginBottom;
    }

    finish(): void {
        figma.viewport.scrollAndZoomIntoView(this.allPages);
        // figma.closePlugin();
    }
}

// Haupt-Handler, der die Nachricht empfängt und die Logik delegiert
figma.ui.onmessage = async (msg: PluginMessage) => {
    if (msg.type !== "create-page") {
        return;
    }

    try {
        // 1. Gemeinsame Initialisierung (wird nur einmal ausgeführt)
        const {dpi = 96, pageFormat = 'letter', padding = 5, markdown = '', highlightColor = COLOR_HEX.HIGHLIGHT, linkColor = COLOR_HEX.LINK} = msg;
        const dimensions = getPageDimensions(dpi, pageFormat as PageFormat, padding);
        const lines = markdown.split("\n");

        const selection = figma.currentPage.selection;
        const selectedTextNode = selection.length === 1 && selection[0].type === 'TEXT' ? selection[0] as TextNode : null;

        // 2. Logik basierend auf der Auswahl delegieren
        if (selectedTextNode) {
            await updateTextNodeWithMarkdown(selectedTextNode, lines, highlightColor, linkColor);
        } else {
            await createPageFrameFromMarkdown(dimensions, lines, highlightColor, linkColor);
        }

        // figma.closePlugin();

    } catch (error) {
        console.error("An error occurred:", error);
        figma.ui.postMessage({type: "error", message: (error as Error).message});
    }
};

async function updateTextNodeWithMarkdown(textNode: TextNode, lines: string[], highlightColor: string = COLOR_HEX.HIGHLIGHT, linkColor: string = COLOR_HEX.LINK): Promise<void> {
    // Fonts laden
    const fontPromises: Promise<void>[] = [];
    for (const font of FONT_FAMILIES) {
        for (const weight of font.weights) {
            fontPromises.push(
                (async () => {
                    try {
                        await figma.loadFontAsync({family: font.name, style: weight});
                    } catch (error) {
                        console.warn(error);
                    }
                })()
            );
        }
    }
    await Promise.all(fontPromises);

    const defaultConfig = MARKDOWN_ELEMENTS.paragraph;
    let processedParts = [];

    // Parse with markdown-it
    const markdown = lines.join('\n');
    const blocks = parseMarkdownToBlocks(markdown);

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex];
        const config = block.config || defaultConfig;
        const {fontSize, style} = config;
        const isBold = style === 'bold' || style === 'bold-italic';
        const isItalic = style === 'italic' || style === 'bold-italic';

        if (block.type === 'list') {
            // Handle list items
            for (let itemIndex = 0; itemIndex < block.items.length; itemIndex++) {
                const item = block.items[itemIndex];

                // Add list prefix (bullet or number) without spaces
                const prefix = block.ordered
                    ? (itemIndex + 1) + '. '
                    : MARKDOWN_ELEMENTS.list.prefix;

                processedParts.push({
                    text: prefix,
                    fontSize: fontSize,
                    isBold: isBold,
                    isItalic: isItalic,
                    link: null,
                    strikethrough: false,
                    underline: false,
                    highlight: false,
                    indentLevel: item.level
                });

                // Add inline parts
                const inlineParts = parseInlineTokens(item.inlineTokens);
                for (const inlinePart of inlineParts) {
                    const partFontSize = (inlinePart.subscript || inlinePart.superscript) ? Math.round(fontSize * 0.7) : fontSize;
                    processedParts.push({
                        text: inlinePart.text,
                        fontSize: partFontSize,
                        isBold: isBold || inlinePart.bold,
                        isItalic: isItalic || inlinePart.italic,
                        link: inlinePart.link,
                        strikethrough: inlinePart.strikethrough,
                        underline: inlinePart.underline,
                        highlight: inlinePart.highlight,
                        indentLevel: undefined
                    });
                }
                processedParts.push({text: '\n', fontSize, isBold, isItalic, link: null, strikethrough: false, underline: false, highlight: false, indentLevel: undefined});
            }
        } else if (block.type !== 'empty') {
            const inlineParts = parseInlineTokens(block.inlineTokens);

            for (const inlinePart of inlineParts) {
                const partFontSize = (inlinePart.subscript || inlinePart.superscript) ? Math.round(fontSize * 0.7) : fontSize;
                processedParts.push({
                    text: inlinePart.text,
                    fontSize: partFontSize,
                    isBold: isBold || inlinePart.bold,
                    isItalic: isItalic || inlinePart.italic,
                    link: inlinePart.link,
                    strikethrough: inlinePart.strikethrough,
                    underline: inlinePart.underline,
                    highlight: inlinePart.highlight,
                    indentLevel: undefined
                });
            }
            processedParts.push({text: '\n', fontSize, isBold, isItalic, link: null, strikethrough: false, underline: false, highlight: false, indentLevel: undefined});
        } else {
            // Empty line - add extra newline to preserve spacing
            processedParts.push({text: '\n', fontSize, isBold: false, isItalic: false, link: null, strikethrough: false, underline: false, highlight: false, indentLevel: undefined});
        }

        // Add extra newline between blocks (to preserve paragraph spacing)
        const nextBlock = blocks[blockIndex + 1];
        if (nextBlock && block.type !== 'empty' && nextBlock.type !== 'empty') {
            processedParts.push({text: '\n', fontSize, isBold: false, isItalic: false, link: null, strikethrough: false, underline: false, highlight: false, indentLevel: undefined});
        }
    }

    // Remove last newline if it exists
    if (processedParts.length > 0 && processedParts[processedParts.length - 1].text === '\n') {
        processedParts.pop();
    }

    // 2. Text im Knoten setzen und formatieren
    textNode.characters = processedParts.map(part => part.text).join('');

    let currentIndex = 0;
    for (const part of processedParts) {
        if (!part.text || part.text.length === 0) continue;

        const rangeEnd = currentIndex + part.text.length;
        let fontStyle = "Regular";
        if (part.isBold && part.isItalic) {
            fontStyle = "Bold Italic";
        } else if (part.isBold) {
            fontStyle = "Bold";
        } else if (part.isItalic) {
            fontStyle = "Italic";
        }

        textNode.setRangeFontSize(currentIndex, rangeEnd, part.fontSize);
        textNode.setRangeFontName(currentIndex, rangeEnd, {family: FONT_FAMILIES[0].name, style: fontStyle});

        // Apply paragraph indent if this part has an indent level
        if (part.indentLevel !== undefined && part.indentLevel > 0) {
            const subitemIndent = MARKDOWN_ELEMENTS.list.subitemIndent || 16;
            const indentAmount = part.indentLevel * subitemIndent;
            textNode.setRangeParagraphIndent(currentIndex, currentIndex + 1, indentAmount);
        }

        // Apply text decoration
        if (part.strikethrough) {
            textNode.setRangeTextDecoration(currentIndex, rangeEnd, "STRIKETHROUGH");
        } else if (part.underline) {
            textNode.setRangeTextDecoration(currentIndex, rangeEnd, "UNDERLINE");
        }

        // Apply highlight color
        if (part.highlight) {
            textNode.setRangeFills(currentIndex, rangeEnd, [{type: "SOLID", color: rgb(highlightColor)}]);
        }

        if (part.link && isAbsoluteUrl(part.link)) {
            textNode.setRangeHyperlink(currentIndex, rangeEnd, {type: "URL", value: part.link});
            textNode.setRangeFills(currentIndex, rangeEnd, [{type: "SOLID", color: rgb(linkColor)}]);
        }

        currentIndex = rangeEnd;
    }
}

async function createPageFrameFromMarkdown(dimensions: PageDimensions, lines: string[], highlightColor: string = COLOR_HEX.HIGHLIGHT, linkColor: string = COLOR_HEX.LINK): Promise<void> {
    const builder = new PageBuilder(dimensions, highlightColor, linkColor);
    await builder.loadFonts();

    // Parse with markdown-it
    const markdown = lines.join('\n');
    const blocks = parseMarkdownToBlocks(markdown);

    for (const block of blocks) {
        const config = block.config || MARKDOWN_ELEMENTS.paragraph;

        switch (block.type) {
            case 'empty':
                // Empty line - create new text node on next content
                builder.yOffset += 8;
                break;

            case 'paragraph':
                // Create text node for paragraph
                await builder.addTextElement(block.content, config, block.inlineTokens);
                break;

            case 'list':
                // Create text node for entire list with all items
                await builder.addListElement(block.items, config);
                break;

            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                // Create text node for heading
                await builder.addTextElement(block.content, config, block.inlineTokens);
                break;
        }
    }

    builder.finish();
}