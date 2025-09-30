// Helper functions for parsing different formatting types
function parseBold(text) {
    const match = text.match(/^\*\*(.*?)\*\*$/);
    if (match) {
        return { text: match[1], bold: true, medium: false, link: null };
    }
    return null;
}

function parseMedium(text) {
    const match = text.match(/^\*([^*]+)\*$/);
    if (match) {
        return { text: match[1], bold: false, medium: true, link: null };
    }
    return null;
}

function parseLink(text) {
    const match = text.match(/^\[(.*?)\]\((.*?)\)$/);
    if (match) {
        return { text: match[1], bold: false, medium: false, link: match[2] };
    }
    return null;
}

// Main function that parses formatted text
export function parseFormattedText(text) {
    const parts = [];
    let currentIndex = 0;

    const regex = /(\*\*[^*]+\*\*|\[.*?\]\(.*?\)|\*[^*]+\*)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Text vor dem Match hinzufügen
        if (match.index > currentIndex) {
            parts.push({
                text: text.slice(currentIndex, match.index),
                bold: false,
                medium: false,
                link: null
            });
        }

        // Verschiedene Formatierungen parsen
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
            parts.push({
                text: match[0],
                bold: false,
                medium: false,
                link: null
            });
        }

        currentIndex = regex.lastIndex;
    }

    // Restlichen Text am Ende hinzufügen
    if (currentIndex < text.length) {
        parts.push({
            text: text.slice(currentIndex),
            bold: false,
            medium: false,
            link: null
        });
    }

    return parts;
}
// Export für Verwendung in anderen Modulen

// Beispiel-Usage:
// const text = "Das ist **fett**, das ist *medium* und das ist ein [Link](https://example.com).";
// const parts = parseFormattedText(text);
// console.log(parts);
// Output:
// [
//   { text: "Das ist ", bold: false, medium: false, link: null },
//   { text: "fett", bold: true, medium: false, link: null },
//   { text: ", das ist ", bold: false, medium: false, link: null },
//   { text: "medium", bold: false, medium: true, link: null },
//   { text: " und das ist ein ", bold: false, medium: false, link: null },
//   { text: "Link", bold: false, medium: false, link: "https://example.com" },
//   { text: ".", bold: false, medium: false, link: null }
// ]
