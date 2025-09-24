import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import chokidar from "chokidar";

async function build(watch = false) {
    fs.mkdirSync("dist", { recursive: true });

    const ctx = await esbuild.context({
        entryPoints: ["src/code.js"],
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

        // Watch HTML and CSS
        const staticWatcher = chokidar.watch(
            [path.resolve("src/ui.html"), path.resolve("src/index.css")],
            { ignoreInitial: true }
        );

        staticWatcher.on("change", (filePath) => {
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

function buildHtml() {
    const htmlPath = path.resolve("src/ui.html");
    const cssPath = path.resolve("src/index.css");

    let html = fs.readFileSync(htmlPath, "utf-8");
    const css = fs.readFileSync(cssPath, "utf-8");

    html = html.replace(
        /<link rel=["']stylesheet["'] href=["']index\.css["']\s*\/?>/,
        `<style>\n${css}\n</style>`
    );

    fs.writeFileSync(path.resolve("dist/ui.html"), html, "utf-8");
    console.log("✅ Built ui.html with inline CSS");
}

const watchMode = process.argv.includes("--watch");
build(watchMode).catch((e) => {
    console.error(e);
    process.exit(1);
});
