import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import chokidar from "chokidar";

async function build(watch = false) {
    fs.mkdirSync("dist", { recursive: true });

    const ctx = await esbuild.context({
        entryPoints: ["src/code.ts"],
        bundle: true,
        outfile: "dist/code.js",
        platform: "browser",
        target: ["es2018"],
        sourcemap: true,
    });

    // initial build
    buildHtml();

    if (watch) {
        console.log("👀 Watching for changes...");

        // Watch entire src folder
        const srcWatcher = chokidar.watch(
            path.resolve("src"),
            {
                ignoreInitial: true,
                ignored: ["**/*.js"] // JS files are handled by esbuild
            }
        );

        srcWatcher.on("change", (filePath) => {
            console.log(`📄 ${path.basename(filePath)} changed, rebuilding HTML...`);
            buildHtml();
        });

        // Watch JS with esbuild
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log("✅ Build done!");
    }
}

function processCSS(cssContent, basePath) {
    // Process @import statements
    return cssContent.replace(/@import\s+["']([^"']+)["'];?/g, (match, importPath) => {
        const fullPath = path.resolve(basePath, importPath);
        if (fs.existsSync(fullPath)) {
            const importedCSS = fs.readFileSync(fullPath, "utf-8");
            // Recursively process imports in the imported file
            return processCSS(importedCSS, path.dirname(fullPath));
        }
        return match; // Keep original if file not found
    });
}

function buildHtml() {
    const htmlPath = path.resolve("src/ui.html");
    const cssPath = path.resolve("src/index.css");
    const testMarkdownPath = path.resolve("src/test_plugin.md");

    let html = fs.readFileSync(htmlPath, "utf-8");
    const rawCSS = fs.readFileSync(cssPath, "utf-8");
    const processedCSS = processCSS(rawCSS, path.dirname(cssPath));

    // Read test markdown content
    let testMarkdown = '';
    if (fs.existsSync(testMarkdownPath)) {
        testMarkdown = fs.readFileSync(testMarkdownPath, "utf-8");
    }

    // Replace CSS link with inline styles
    html = html.replace(
        /<link rel=["']stylesheet["'] href=["']index\.css["']\s*\/?>/,
        `<style>\n${processedCSS}\n</style>`
    );

    // Replace test markdown placeholder with actual content
    html = html.replace(
        /const testMarkdown = `[^`]*`;/,
        `const testMarkdown = \`${testMarkdown.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\`;`
    );

    fs.writeFileSync(path.resolve("dist/ui.html"), html, "utf-8");
    console.log("✅ Built ui.html with inline CSS and test markdown");
}

const watchMode = process.argv.includes("--watch");
build(watchMode).catch((e) => {
    console.error(e);
    process.exit(1);
});
