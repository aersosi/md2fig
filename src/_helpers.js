// Return if match = Bold
export function parseBold(match) {
    if (match.startsWith("**") && match.endsWith("**")) {
        return {text: match.slice(2, -2), bold: true, medium: false, link: null};
    }
    return null;
}

// Return if match = Medium
export function parseMedium(match) {
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
export function parseLink(match) {
    const linkMatch = match.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
        return {text: linkMatch[1], bold: false, medium: false, link: linkMatch[2]};
    }
    return null;
}