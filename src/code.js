import { FONT_FAMILY, getPageDimensions, PLUGIN_UI_HEIGHT, PLUGIN_UI_WIDTH } from "./_constants.js";

// Show UI
figma.showUI(__html__, {width: PLUGIN_UI_WIDTH, height: PLUGIN_UI_HEIGHT});

async function createTextNode(content, fontSize, isBold, x, y, dimensions) {
    const textNode = figma.createText();
    await figma.loadFontAsync({family: FONT_FAMILY, style: isBold ? "Bold" : "Regular"});
    textNode.fontName = {family: FONT_FAMILY, style: isBold ? "Bold" : "Regular"};
    textNode.fontSize = fontSize;
    textNode.x = x;
    textNode.y = y;
    textNode.textAutoResize = "WIDTH_AND_HEIGHT";
    textNode.characters = content;

    if (textNode.width > dimensions.CONTENT_WIDTH) {
        textNode.textAutoResize = "HEIGHT";
        textNode.resize(dimensions.CONTENT_WIDTH, textNode.height);
    }

    return textNode;
}


// Return if match = Bold
function parseBold(match) {
    if (match.startsWith("**") && match.endsWith("**")) {
        return {text: match.slice(2, -2), bold: true, medium: false, link: null};
    }
    return null;
}

// Return if match = Medium
function parseMedium(match) {
    // Prüfen ob es ein einzelner Stern ist (nicht doppelt)
    if (match.startsWith("*") && match.endsWith("*") && !match.startsWith("**") && !match.endsWith("***")) {
        const content = match.slice(1, -1);
        // Sicherstellen, dass der Inhalt nicht leer ist
        if (content.length > 0) {
            return { text: content, medium: true, bold: false, link: null };
        }
    }
    return null;
}

// Return if match = Link
function parseLink(match) {
    const linkMatch = match.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
        return {text: linkMatch[1], bold: false, medium: false, link: linkMatch[2]};
    }
    return null;
}

// Main function that parses text
function parseFormattedText(text) {
    const parts = [];
    let currentIndex = 0;
    // Wichtig: ** muss vor * kommen, damit Bold vor Medium gematched wird
    const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|\*[^*].*?[^*]\*)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > currentIndex) {
            parts.push({text: text.slice(currentIndex, match.index), bold: false, medium: false, link: null});
        }

        const parsedBold = parseBold(match[0]);
        const parsedLink = parseLink(match[0]);
        const parsedMedium = parseMedium(match[0]);

        if (parsedBold) {
            parts.push(parsedBold);
        } else if (parsedLink) {
            parts.push(parsedLink);
        } else if (parsedMedium) {
            parts.push(parsedMedium);
        } else {
            // Fallback: wenn nichts matched, als normalen Text behandeln
            parts.push({text: match[0], bold: false, medium: false, link: null});
        }

        currentIndex = regex.lastIndex;
    }

    if (currentIndex < text.length) {
        parts.push({text: text.slice(currentIndex), bold: false, medium: false, link: null});
    }

    return parts;
}


async function createFormattedTextNode(content, fontSize, defaultBold, x, y, dimensions) {
    const textNode = figma.createText();
    await figma.loadFontAsync({family: FONT_FAMILY, style: "Regular"});
    await figma.loadFontAsync({family: FONT_FAMILY, style: "Semi Bold"});
    await figma.loadFontAsync({family: FONT_FAMILY, style: "Bold"});

    textNode.fontSize = fontSize;
    textNode.x = x;
    textNode.y = y;
    textNode.textAutoResize = "WIDTH_AND_HEIGHT";

    const parts = parseFormattedText(content);
    let currentIndex = 0;

    for (const part of parts) {
        if (part.text.length === 0) continue; // Skip empty parts

        textNode.insertCharacters(currentIndex, part.text);

        // Determine font style based on formatting
        let fontStyle = "Regular";
        if (part.bold || defaultBold) {
            fontStyle = "Bold";
        } else if (part.medium) {
            fontStyle = "Semi Bold";
        }

        textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
            family: FONT_FAMILY,
            style: fontStyle,
        });

        if (part.link) {
            textNode.setRangeHyperlink(currentIndex, currentIndex + part.text.length, {type: "URL", value: part.link});
            textNode.setRangeFills(currentIndex, currentIndex + part.text.length, [{
                type: "SOLID",
                color: {r: 0, g: 0, b: 1}
            }]); // Blue color for links
        }

        currentIndex += part.text.length;
    }

    if (textNode.width > dimensions.CONTENT_WIDTH) {
        textNode.textAutoResize = "HEIGHT";
        textNode.resize(dimensions.CONTENT_WIDTH, textNode.height);
    }

    return textNode;
}

// Function to create a new page/frame
function createNewPage(pageNumber, xPosition, dimensions) {
    const page = figma.createFrame();
    page.resize(dimensions.PAGE_WIDTH, dimensions.PAGE_HEIGHT);
    page.x = xPosition;
    page.y = 0;
    page.fills = [{type: "SOLID", color: {r: 1, g: 1, b: 1}}];
    page.name = `Resume Page ${pageNumber}`;
    return page;
}

figma.ui.onmessage = async (msg) => {
    if (msg.type === "create-resume") {
        try {
            const dpi = msg.dpi || 96;
            const dimensions = getPageDimensions(dpi);
            const lines = msg.markdown.split("\n");
            let yOffset = dimensions.MARGIN;
            let pageNumber = 1;
            let xPosition = 0;

            // Create the first page/frame
            let currentPage = createNewPage(pageNumber, xPosition, dimensions);
            let allPages = [currentPage];

            for (const line of lines) {
                if (line.trim() === "") {
                    yOffset += 8; // Add space for empty lines
                    continue;
                }

                let fontSize = 10;
                let isBold = false;
                let content = line;

                // Handle different Markdown headers and list items
                if (line.startsWith("#### ")) {
                    fontSize = 12;
                    isBold = true;
                    content = line.replace(/^####\s*/, "");
                    yOffset += 6;
                } else if (line.startsWith("# ")) {
                    fontSize = 24;
                    isBold = true;
                    content = line.replace(/^#\s*/, "");
                    yOffset += 10;
                } else if (line.startsWith("## ")) {
                    fontSize = 18;
                    isBold = true;
                    yOffset += 10;
                    content = line.replace(/^##\s*/, "");
                } else if (line.startsWith("### ")) {
                    fontSize = 14;
                    isBold = true;
                    yOffset += 8;
                    content = line.replace(/^###\s*/, "");
                } else if (line.startsWith("- ")) {
                    fontSize = 10;
                    content = "• " + line.replace(/^-+\s*/, "");
                    yOffset += 4;
                } else {
                    yOffset += 2;
                }

                // Create the text node with formatted content
                const textNode = await createFormattedTextNode(
                    content,
                    fontSize,
                    isBold,
                    dimensions.MARGIN,
                    yOffset,
                    dimensions
                );

                // Check if adding this text node exceeds the page height
                if (yOffset + textNode.height + dimensions.MARGIN > dimensions.PAGE_HEIGHT) {
                    // Create a new page and reset yOffset
                    pageNumber += 1;
                    xPosition += dimensions.PAGE_WIDTH + dimensions.PAGE_GAP;
                    currentPage = createNewPage(pageNumber, xPosition, dimensions);
                    allPages.push(currentPage);
                    yOffset = dimensions.MARGIN;

                    // Update the position of the text node
                    textNode.x = dimensions.MARGIN;
                    textNode.y = yOffset;
                }

                // Append the text node to the current page
                currentPage.appendChild(textNode);
                yOffset += textNode.height + 4;
            }

            // Scroll and zoom into all pages
            figma.viewport.scrollAndZoomIntoView(allPages);
            figma.closePlugin();
        } catch (error) {
            console.error("An error occurred:", error);
            figma.ui.postMessage({type: "error", message: error.message});
        }
    }
};