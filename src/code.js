import { FONT_FAMILIES, MARKDOWN_ELEMENTS, PLUGIN_UI_DIMENSIONS } from "./_constants.js";
import { getPageDimensions, parseMarkdownToBlocks, parseInlineTokens } from "./_helpers.js"

figma.showUI(__html__, {width: PLUGIN_UI_DIMENSIONS.width, height: PLUGIN_UI_DIMENSIONS.height});

class ResumeBuilder {
    constructor(dimensions) {
        this.dimensions = dimensions;
        this.yOffset = dimensions.PADDING;
        this.pageNumber = 1;
        this.xPosition = 0;
        this.currentPage = this.createNewPage();
        this.allPages = [this.currentPage];
        this.fontsLoaded = false;
    }

    async loadFonts() {
        if (this.fontsLoaded) return;

        const fontPromises = FONT_FAMILIES.flatMap(font =>
            font.weights.map(async weight => {
                try {
                    await figma.loadFontAsync({family: font.name, style: weight});
                } catch (error) {
                    console.warn(error);
                }
            })
        );

        await Promise.all(fontPromises);

        this.fontsLoaded = true;
    }

    createNewPage() {
        const page = figma.createFrame();
        page.resize(this.dimensions.PAGE_WIDTH, this.dimensions.PAGE_HEIGHT);
        page.x = this.xPosition;
        page.y = 0;
        page.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
        page.name = `Resume Page ${this.pageNumber}`;
        return page;
    }

    checkAndCreateNewPage(textHeight) {
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

    async createFormattedTextNode(content, fontSize, isBold, isItalic) {
        const textNode = figma.createText();
        textNode.fontSize = fontSize;
        textNode.x = this.dimensions.PADDING;
        textNode.y = this.yOffset;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";

        const parts = paseSubstring(content);
        let currentIndex = 0;
        let linkParts = []; // Store link information for later processing

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

        // Second pass: apply hyperlinks after all text is inserted
        for (const linkPart of linkParts) {
            textNode.setRangeHyperlink(linkPart.startIndex, linkPart.endIndex, {
                type: "URL",
                value: linkPart.url
            });
            textNode.setRangeFills(linkPart.startIndex, linkPart.endIndex, [{
                type: "SOLID",
                color: {r: 0, g: 0, b: 1}
            }]);
        }

        if (textNode.width > this.dimensions.CONTENT_WIDTH) {
            textNode.textAutoResize = "HEIGHT";
            textNode.resize(this.dimensions.CONTENT_WIDTH, textNode.height);
        }

        return textNode;
    }

    async addTextElement(content, fontSize, isBold, isItalic, marginTop = 0, marginBottom = 4) {
        this.yOffset += marginTop;

        const textNode = await this.createFormattedTextNode(content, fontSize, isBold, isItalic);

        // Check if we need a new page and update position if so
        const newPage = this.checkAndCreateNewPage(textNode.height);
        if (newPage) {
            textNode.x = this.dimensions.PADDING;
            textNode.y = this.yOffset;
        }

        this.currentPage.appendChild(textNode);
        this.yOffset += textNode.height + marginBottom;
    }

    async processParagraph(lines) {
        if (lines.length === 0) return;

        const content = lines.join(" ");
        const config = MARKDOWN_ELEMENTS.paragraph;
        await this.addTextElement(content, config.fontSize, config.isBold, config.isItalic, config.marginTop, config.marginBottom);
    }

    async processList(listItems) {
        if (listItems.length === 0) return;

        const content = listItems.join("\n");
        const config = MARKDOWN_ELEMENTS.list;
        await this.addTextElement(content, config.fontSize, config.isBold, config.isItalic, config.marginTop, config.marginBottom);
    }

    finish() {
        figma.viewport.scrollAndZoomIntoView(this.allPages);
        // figma.closePlugin();
    }
}

// Haupt-Handler, der die Nachricht empfängt und die Logik delegiert
figma.ui.onmessage = async (msg) => {
    if (msg.type !== "create-resume") {
        return;
    }

    try {
        // 1. Gemeinsame Initialisierung (wird nur einmal ausgeführt)
        const {dpi = 96, pageFormat = 'letter', padding = 5, markdown} = msg;
        const dimensions = getPageDimensions(dpi, pageFormat, padding);
        const lines = markdown.split("\n");

        const selection = figma.currentPage.selection;
        const selectedTextNode = selection.length === 1 && selection[0].type === 'TEXT' ? selection[0] : null;

        // 2. Logik basierend auf der Auswahl delegieren
        if (selectedTextNode) {
            await updateTextNodeWithMarkdown(selectedTextNode, lines);
        } else {
            await createResumeFrameFromMarkdown(dimensions, lines);
        }

        // figma.closePlugin();

    } catch (error) {
        console.error("An error occurred:", error);
        figma.ui.postMessage({type: "error", message: error.message});
    }
};

/**
 * Aktualisiert einen vorhandenen Textknoten mit formatiertem Markdown-Inhalt.
 * @param {TextNode} textNode - Der zu aktualisierende Figma-Textknoten.
 * @param {string[]} lines - Die Markdown-Zeilen als Array.
 */
async function updateTextNodeWithMarkdown(textNode, lines) {
    // Fonts laden
    const fontPromises = FONT_FAMILIES.flatMap(font =>
        font.weights.map(async weight => {
            try {
                await figma.loadFontAsync({family: font.name, style: weight});
            } catch (error) {
                console.warn(error);
            }
        })
    );
    await Promise.all(fontPromises);

    const defaultConfig = MARKDOWN_ELEMENTS.paragraph;
    let processedParts = [];

    // Parse with markdown-it
    const markdown = lines.join('\n');
    const blocks = parseMarkdownToBlocks(markdown);

    for (const block of blocks) {
        const {fontSize, isBold, isItalic = false} = block.config || defaultConfig;

        if (block.type === 'list') {
            // Handle list items
            for (const item of block.items) {
                const inlineParts = parseInlineTokens(item.inlineTokens);

                for (const inlinePart of inlineParts) {
                    processedParts.push({
                        text: inlinePart.text,
                        fontSize: fontSize,
                        isBold: isBold || inlinePart.bold,
                        isItalic: isItalic || inlinePart.italic,
                        link: inlinePart.link
                    });
                }
                processedParts.push({text: '\n', fontSize, isBold, isItalic, link: null});
            }
        } else if (block.type !== 'empty') {
            const inlineParts = parseInlineTokens(block.inlineTokens);

            for (const inlinePart of inlineParts) {
                processedParts.push({
                    text: inlinePart.text,
                    fontSize: fontSize,
                    isBold: isBold || inlinePart.bold,
                    isItalic: isItalic || inlinePart.italic,
                    link: inlinePart.link
                });
            }
            processedParts.push({text: '\n', fontSize, isBold, isItalic, link: null});
        } else {
            // Empty line
            processedParts.push({text: '\n', fontSize, isBold: false, isItalic: false, link: null});
        }
    }
    processedParts.pop(); // Remove last newline

    // 2. Text im Knoten setzen und formatieren
    textNode.characters = processedParts.map(part => part.text).join('');

    let currentIndex = 0;
    for (const part of processedParts) {
        if (part.text.length === 0) continue;

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

        if (part.link) {
            textNode.setRangeHyperlink(currentIndex, rangeEnd, {type: "URL", value: part.link});
            textNode.setRangeFills(currentIndex, rangeEnd, [{type: "SOLID", color: {r: 0, g: 0, b: 1}}]);
        }

        currentIndex = rangeEnd;
    }
}

/**
 * Erstellt einen neuen Figma-Frame und füllt ihn basierend auf dem Markdown-Inhalt.
 * @param {object} dimensions - Die Abmessungen für den neuen Frame.
 * @param {string[]} lines - Die Markdown-Zeilen als Array.
 */
async function createResumeFrameFromMarkdown(dimensions, lines) {
    const builder = new ResumeBuilder(dimensions);
    await builder.loadFonts();

    let paragraphLines = [];
    let listItems = [];

    const processPendingElements = async () => {
        if (paragraphLines.length > 0) {
            await builder.processParagraph(paragraphLines);
            paragraphLines = [];
        }
        if (listItems.length > 0) {
            await builder.processList(listItems);
            listItems = [];
        }
    };

    for (const line of lines) {
        const parsed = paseLine(line);

        switch (parsed.type) {
            case 'empty':
                await processPendingElements();
                builder.yOffset += 8;
                break;
            case 'paragraph':
                await processPendingElements(); // Verarbeite Listen, bevor ein neuer Paragraph beginnt
                paragraphLines.push(parsed.content);
                break;
            case 'list':
                await processPendingElements(); // Verarbeite Paragraphen, bevor eine neue Liste beginnt
                listItems.push(parsed.content);
                break;
            case 'link': // Links werden wie Header behandelt, nur mit Paragraphen-Stil
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                await processPendingElements();
                const config = parsed.config || MARKDOWN_ELEMENTS.paragraph;
                await builder.addTextElement(
                    parsed.content,
                    config.fontSize,
                    config.isBold,
                    config.isItalic,
                    config.marginTop,
                    config.marginBottom
                );
                break;
        }
    }

    await processPendingElements(); // Verarbeite restliche Elemente am Ende
    builder.finish();
}