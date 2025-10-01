import {
    FONT_FAMILY,
    FONT_FAMILIES,
    MARKDOWN_ELEMENTS,
    PLUGIN_UI_DIMENSIONS
} from "./_constants.js";
import { parseFormattedText, parseMarkdownLine, getPageDimensions } from "./_helpers.js"

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

    async createFormattedTextNode(content, fontSize, isBold) {
        const textNode = figma.createText();
        textNode.fontSize = fontSize;
        textNode.x = this.dimensions.PADDING;
        textNode.y = this.yOffset;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";

        const parts = parseFormattedText(content);
        let currentIndex = 0;
        let linkParts = []; // Store link information for later processing

        // First pass: insert text and apply basic formatting
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

    async addTextElement(content, fontSize, isBold, marginTop = 0, marginBottom = 4) {
        this.yOffset += marginTop;

        const textNode = await this.createFormattedTextNode(content, fontSize, isBold);

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
        await this.addTextElement(content, config.fontSize, config.isBold, config.marginTop, config.marginBottom);
    }

    async processList(listItems) {
        if (listItems.length === 0) return;

        const content = listItems.join("\n");
        const config = MARKDOWN_ELEMENTS.list;
        await this.addTextElement(content, config.fontSize, config.isBold, config.marginTop, config.marginBottom);
    }

    finish() {
        figma.viewport.scrollAndZoomIntoView(this.allPages);
        // figma.closePlugin();
    }
}

figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-resume") {
        try {
            // Check if a text node is selected
            const selection = figma.currentPage.selection;
            if (selection.length === 1 && selection[0].type === 'TEXT') {
                const textNode = selection[0];

                const dpi = msg.dpi || 96;
                const pageFormat = msg.pageFormat || 'letter';
                const padding = msg.padding || 5;
                const dimensions = getPageDimensions(dpi, pageFormat, padding);

                const builder = new ResumeBuilder(dimensions);
                await builder.loadFonts();

                // Build formatted content with style information
                const lines = msg.markdown.split('\n');
                let formattedParts = [];

                for (const line of lines) {
                    const parsed = parseMarkdownLine(line);
                    let content = '';
                    let fontSize = MARKDOWN_ELEMENTS.paragraph.fontSize;
                    let isBold = MARKDOWN_ELEMENTS.paragraph.isBold;

                    if (parsed.type === 'list') {
                        content = parsed.content;
                        fontSize = parsed.config.fontSize;
                        isBold = parsed.config.isBold;
                    } else if (parsed.type === 'paragraph') {
                        content = parsed.content;
                        fontSize = MARKDOWN_ELEMENTS.paragraph.fontSize;
                        isBold = MARKDOWN_ELEMENTS.paragraph.isBold;
                    } else if (parsed.config) {
                        content = parsed.content;
                        fontSize = parsed.config.fontSize;
                        isBold = parsed.config.isBold;
                    } else if (parsed.type === 'empty') {
                        content = '';
                        fontSize = MARKDOWN_ELEMENTS.paragraph.fontSize;
                        isBold = MARKDOWN_ELEMENTS.paragraph.isBold;
                    } else {
                        content = line;
                        fontSize = MARKDOWN_ELEMENTS.paragraph.fontSize;
                        isBold = MARKDOWN_ELEMENTS.paragraph.isBold;
                    }

                    formattedParts.push({ content, fontSize, isBold });
                }

                // First, process all content to remove markdown and get the actual text
                let processedParts = [];
                for (const part of formattedParts) {
                    if (part.content.length > 0) {
                        const inlineParts = parseFormattedText(part.content);
                        for (const inlinePart of inlineParts) {
                            processedParts.push({
                                text: inlinePart.text,
                                fontSize: part.fontSize,
                                isBold: part.isBold || inlinePart.bold,
                                isMedium: inlinePart.medium,
                                link: inlinePart.link
                            });
                        }
                    }
                    // Add newline part if this isn't the last part
                    if (formattedParts.indexOf(part) < formattedParts.length - 1) {
                        processedParts.push({
                            text: '\n',
                            fontSize: part.fontSize,
                            isBold: part.isBold,
                            isMedium: false,
                            link: null
                        });
                    }
                }

                // Set the actual text (without markdown syntax)
                textNode.characters = processedParts.map(part => part.text).join('');

                // Apply formatting
                let currentIndex = 0;
                for (const part of processedParts) {
                    if (part.text.length === 0) continue;

                    // Set font size
                    textNode.setRangeFontSize(currentIndex, currentIndex + part.text.length, part.fontSize);

                    // Set font style
                    let fontStyle = "Regular";
                    if (part.isBold) {
                        fontStyle = "Bold";
                    } else if (part.isMedium) {
                        fontStyle = "Semi Bold";
                    }

                    textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
                        family: FONT_FAMILY,
                        style: fontStyle,
                    });

                    // Apply hyperlinks
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

                figma.closePlugin();
                return;
            }

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

                    case 'link':
                        await processPendingParagraph();
                        await processPendingList();
                        const linkConfig = MARKDOWN_ELEMENTS.paragraph; // Use paragraph styling for links
                        await builder.addTextElement(
                            parsed.content,
                            linkConfig.fontSize,
                            linkConfig.isBold,
                            linkConfig.marginTop,
                            linkConfig.marginBottom
                        );
                        break;

                    default: // headers
                        await processPendingParagraph();
                        await processPendingList();
                        await builder.addTextElement(
                            parsed.content,
                            parsed.config.fontSize,
                            parsed.config.isBold,
                            parsed.config.marginTop,
                            parsed.config.marginBottom
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