// Show the UI
figma.showUI(__html__, { width: 400, height: 500 });

// Constants for page dimensions and margins
const PAGE_WIDTH = 8.5 * 96; // Standard US Letter size width in pixels
const PAGE_HEIGHT = 11 * 96; // Standard US Letter size height in pixels
const MARGIN = 0.5 * 96; // Half-inch margin in pixels
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const PAGE_GAP = 20; // Gap between pages

async function createTextNode(content, fontSize, isBold, x, y) {
  const textNode = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: isBold ? "Bold" : "Regular" });
  textNode.fontName = { family: "Inter", style: isBold ? "Bold" : "Regular" };
  textNode.fontSize = fontSize;
  textNode.x = x;
  textNode.y = y;
  textNode.textAutoResize = "WIDTH_AND_HEIGHT";
  textNode.characters = content;

  if (textNode.width > CONTENT_WIDTH) {
    textNode.textAutoResize = "HEIGHT";
    textNode.resize(CONTENT_WIDTH, textNode.height);
  }

  return textNode;
}

// Function to parse bold text and links
function parseFormattedText(text) {
  const parts = [];
  let currentIndex = 0;
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      parts.push({ text: text.slice(currentIndex, match.index), bold: false, link: null });
    }

    if (match[0].startsWith("**")) {
      parts.push({ text: match[0].slice(2, -2), bold: true, link: null });
    } else {
      const linkMatch = match[0].match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        parts.push({ text: linkMatch[1], bold: false, link: linkMatch[2] });
      }
    }

    currentIndex = regex.lastIndex;
  }

  if (currentIndex < text.length) {
    parts.push({ text: text.slice(currentIndex), bold: false, link: null });
  }

  return parts;
}

async function createFormattedTextNode(content, fontSize, defaultBold, x, y) {
  const textNode = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  textNode.fontSize = fontSize;
  textNode.x = x;
  textNode.y = y;
  textNode.textAutoResize = "WIDTH_AND_HEIGHT";

  const parts = parseFormattedText(content);
  let currentIndex = 0;

  for (const part of parts) {
    if (part.text.length === 0) continue; // Skip empty parts

    textNode.insertCharacters(currentIndex, part.text);
    textNode.setRangeFontName(currentIndex, currentIndex + part.text.length, {
      family: "Inter",
      style: part.bold || defaultBold ? "Bold" : "Regular",
    });

    if (part.link) {
      textNode.setRangeHyperlink(currentIndex, currentIndex + part.text.length, { type: "URL", value: part.link });
      textNode.setRangeFills(currentIndex, currentIndex + part.text.length, [{ type: "SOLID", color: { r: 0, g: 0, b: 1 } }]); // Blue color for links
    }

    currentIndex += part.text.length;
  }

  if (textNode.width > CONTENT_WIDTH) {
    textNode.textAutoResize = "HEIGHT";
    textNode.resize(CONTENT_WIDTH, textNode.height);
  }

  return textNode;
}

// Function to create a new page/frame
function createNewPage(pageNumber, xPosition) {
  const page = figma.createFrame();
  page.resize(PAGE_WIDTH, PAGE_HEIGHT);
  page.x = xPosition;
  page.y = 0;
  page.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  page.name = `Resume Page ${pageNumber}`;
  return page;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "create-resume") {
    try {
      const lines = msg.markdown.split("\n");
      let yOffset = MARGIN;
      let pageNumber = 1;
      let xPosition = 0;

      // Create the first page/frame
      let currentPage = createNewPage(pageNumber, xPosition);
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
        if (line.startsWith("# ")) {
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
          MARGIN,
          yOffset
        );

        // Check if adding this text node exceeds the page height
        if (yOffset + textNode.height + MARGIN > PAGE_HEIGHT) {
          // Create a new page and reset yOffset
          pageNumber += 1;
          xPosition += PAGE_WIDTH + PAGE_GAP;
          currentPage = createNewPage(pageNumber, xPosition);
          allPages.push(currentPage);
          yOffset = MARGIN;

          // Update the position of the text node
          textNode.x = MARGIN;
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
      figma.ui.postMessage({ type: "error", message: error.message });
    }
  }
};