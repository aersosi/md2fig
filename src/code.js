import { FONT_FAMILY, getPageDimensions, PLUGIN_UI_HEIGHT, PLUGIN_UI_WIDTH } from "./_constants.js";
import { parseFormattedText } from "./_helpers.js"

figma.showUI(__html__, {width: PLUGIN_UI_WIDTH, height: PLUGIN_UI_HEIGHT});

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

        await Promise.all([
            figma.loadFontAsync({family: FONT_FAMILY, style: "Regular"}),
            figma.loadFontAsync({family: FONT_FAMILY, style: "Semi Bold"}),
            figma.loadFontAsync({family: FONT_FAMILY, style: "Bold"})
        ]);

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

    async createFormattedTextNode(content, fontSize, isBold) {
        const textNode = figma.createText();
        textNode.fontSize = fontSize;
        textNode.x = this.dimensions.PADDING;
        textNode.y = this.yOffset;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";

        const parts = parseFormattedText(content);
        let currentIndex = 0;

        for (const part of parts) {
            if (part.text.length === 0) continue;

            textNode.insertCharacters(currentIndex, part.text);

            let fontStyle = "Regular";
            if (part.bold || isBold) {
                fontStyle = "Bold";
            } else if (part.medium) {
                fontStyle = "Semi Bold";
            }

            textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
                family: FONT_FAMILY,
                style: fontStyle,
            });

            if (part.link) {
                textNode.setRangeHyperlink(currentIndex, currentIndex + part.text.length, {
                    type: "URL",
                    value: part.link
                });
                textNode.setRangeFills(currentIndex, currentIndex + part.text.length, [{
                    type: "SOLID",
                    color: {r: 0, g: 0, b: 1}
                }]);
            }

            currentIndex += part.text.length;
        }

        if (textNode.width > this.dimensions.CONTENT_WIDTH) {
            textNode.textAutoResize = "HEIGHT";
            textNode.resize(this.dimensions.CONTENT_WIDTH, textNode.height);
        }

        return textNode;
    }

    async addTextElement(content, fontSize, isBold, spaceBefore = 0, spaceAfter = 4) {
        this.yOffset += spaceBefore;

        const textNode = await this.createFormattedTextNode(content, fontSize, isBold);

        // Check if we need a new page and update position if so
        const newPage = this.checkAndCreateNewPage(textNode.height);
        if (newPage) {
            textNode.x = this.dimensions.PADDING;
            textNode.y = this.yOffset;
        }

        this.currentPage.appendChild(textNode);
        this.yOffset += textNode.height + spaceAfter;
    }

    async processParagraph(lines) {
        if (lines.length === 0) return;

        const content = lines.join(" ");
        await this.addTextElement(content, 10, false, 2, 4);
    }

    async processList(listItems) {
        if (listItems.length === 0) return;

        const content = listItems.join("\n");
        await this.addTextElement(content, 10, false, 4, 4);
    }

    finish() {
        figma.viewport.scrollAndZoomIntoView(this.allPages);
        figma.closePlugin();
    }
}

// Markdown element configurations
const MARKDOWN_ELEMENTS = {
    'h1': { regex: /^#\s+(.*)$/, fontSize: 24, isBold: true, spaceBefore: 10, spaceAfter: 4 },
    'h2': { regex: /^##\s+(.*)$/, fontSize: 18, isBold: true, spaceBefore: 10, spaceAfter: 4 },
    'h3': { regex: /^###\s+(.*)$/, fontSize: 14, isBold: true, spaceBefore: 8, spaceAfter: 4 },
    'h4': { regex: /^####\s+(.*)$/, fontSize: 12, isBold: true, spaceBefore: 6, spaceAfter: 4 },
    'list': { regex: /^-\s+(.*)$/, fontSize: 10, isBold: false, spaceBefore: 4, spaceAfter: 4, prefix: '• ' }
};

function parseMarkdownLine(line) {
    if (line.trim() === "") return { type: 'empty' };

    for (const [type, config] of Object.entries(MARKDOWN_ELEMENTS)) {
        const match = line.match(config.regex);
        if (match) {
            const content = type === 'list' ? config.prefix + match[1] : match[1];
            return { type, content, config };
        }
    }

    return { type: 'paragraph', content: line };
}

figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-resume") {
        try {
            const dpi = msg.dpi || 96;
            const pageFormat = msg.pageFormat || 'letter';
            const padding = msg.padding || 5;
            const dimensions = getPageDimensions(dpi, pageFormat, padding);
            const lines = msg.markdown.split("\n");

            const builder = new ResumeBuilder(dimensions);
            await builder.loadFonts();

            let paragraphLines = [];
            let listItems = [];

            const processPendingParagraph = async () => {
                if (paragraphLines.length > 0) {
                    await builder.processParagraph(paragraphLines);
                    paragraphLines = [];
                }
            };

            const processPendingList = async () => {
                if (listItems.length > 0) {
                    await builder.processList(listItems);
                    listItems = [];
                }
            };

            for (const line of lines) {
                const parsed = parseMarkdownLine(line);

                switch (parsed.type) {
                    case 'empty':
                        await processPendingParagraph();
                        await processPendingList();
                        builder.yOffset += 8;
                        break;

                    case 'paragraph':
                        await processPendingList();
                        paragraphLines.push(parsed.content);
                        break;

                    case 'list':
                        await processPendingParagraph();
                        listItems.push(parsed.content);
                        break;

                    default: // headers
                        await processPendingParagraph();
                        await processPendingList();
                        await builder.addTextElement(
                            parsed.content,
                            parsed.config.fontSize,
                            parsed.config.isBold,
                            parsed.config.spaceBefore,
                            parsed.config.spaceAfter
                        );
                }
            }

            // Process any remaining paragraph lines and list items
            await processPendingParagraph();
            await processPendingList();

            builder.finish();

        } catch (error) {
            console.error("An error occurred:", error);
            figma.ui.postMessage({type: "error", message: error.message});
        }
    }
};