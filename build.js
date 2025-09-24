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

    // initial copy
    copyHtml();

    if (watch) {
        console.log("👀 Watching for changes...");
        await ctx.watch();

        // Watch HTML separately
        const htmlWatcher = chokidar.watch("src/ui.html");
        htmlWatcher.on("change", () => {
            console.log("📄 ui.html changed, copying...");
            copyHtml();
        });
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log("✅ Build done!");
    }
}

function copyHtml() {
    fs.copyFileSync(path.resolve("src/ui.html"), path.resolve("dist/ui.html"));
}

const watchMode = process.argv.includes("--watch");
build(watchMode).catch((e) => {
    console.error(e);
    process.exit(1);
});
