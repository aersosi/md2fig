import { FONT_FAMILY, getPageDimensions, MARKDOWN_ELEMENTS, PLUGIN_UI_HEIGHT, PLUGIN_UI_WIDTH } from "./_constants.js";
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
            figma.loadFontAsync({family: FONT_FAMILY, style: "Bold"}),
            figma.loadFontAsync({family: "Slussen", style: "Regular"}),
            figma.loadFontAsync({family: "Slussen", style: "Medium"}),
            figma.loadFontAsync({family: "Slussen", style: "Bold"})
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


function parseMarkdownLine(line) {
    if (line.trim() === "") return {type: 'empty'};

    for (const [type, config] of Object.entries(MARKDOWN_ELEMENTS)) {
        const match = line.match(config.regex);
        if (match) {
            const content = type === 'list' ? config.prefix + match[1] : match[1];
            return {type, content, config};
        }
    }

    return {type: 'paragraph', content: line};
}

figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-resume") {
        try {
            // Check if a text node is selected
            const selection = figma.currentPage.selection;
            if (selection.length === 1 && selection[0].type === 'TEXT') {
                const textNode = selection[0];
                await Promise.all([
                    figma.loadFontAsync({ family: FONT_FAMILY, style: "Regular" }),
                    figma.loadFontAsync({ family: FONT_FAMILY, style: "Semi Bold" }),
                    figma.loadFontAsync({ family: FONT_FAMILY, style: "Bold" }),
                    figma.loadFontAsync({ family: "Slussen", style: "Regular" }),
                    figma.loadFontAsync({ family: "Slussen", style: "Medium" }),
                    figma.loadFontAsync({ family: "Slussen", style: "Bold" })
                ]);

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

                // Apply formatting to the text node
                const fullText = formattedParts.map(part => part.content).join('\n');
                textNode.characters = fullText;

                let currentIndex = 0;
                for (const part of formattedParts) {
                    if (part.content.length > 0) {
                        // Set font size
                        textNode.setRangeFontSize(currentIndex, currentIndex + part.content.length, part.fontSize);

                        // Set font style (bold/regular)
                        const fontStyle = part.isBold ? "Bold" : "Regular";
                        textNode.setRangeFontName(currentIndex, currentIndex + part.content.length, {
                            family: FONT_FAMILY,
                            style: fontStyle,
                        });

                        // Apply inline formatting (bold, links, etc.)
                        const inlineParts = parseFormattedText(part.content);
                        let inlineIndex = currentIndex;
                        for (const inlinePart of inlineParts) {
                            if (inlinePart.text.length === 0) continue;

                            let inlineFontStyle = part.isBold ? "Bold" : "Regular";
                            if (inlinePart.bold) {
                                inlineFontStyle = "Bold";
                            } else if (inlinePart.medium) {
                                inlineFontStyle = "Semi Bold";
                            }

                            textNode.setRangeFontName(inlineIndex, inlineIndex + inlinePart.text.length, {
                                family: FONT_FAMILY,
                                style: inlineFontStyle,
                            });

                            if (inlinePart.link) {
                                textNode.setRangeHyperlink(inlineIndex, inlineIndex + inlinePart.text.length, {
                                    type: "URL",
                                    value: inlinePart.link
                                });
                                textNode.setRangeFills(inlineIndex, inlineIndex + inlinePart.text.length, [{
                                    type: "SOLID",
                                    color: {r: 0, g: 0, b: 1}
                                }]);
                            }

                            inlineIndex += inlinePart.text.length;
                        }
                    }
                    currentIndex += part.content.length + 1; // +1 for newline
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