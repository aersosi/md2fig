// build.js
import esbuild from "esbuild";
import fs from "fs";
import path from "path";

async function build(watch = false) {
    // Stelle sicher, dass "dist" existiert
    fs.mkdirSync("dist", { recursive: true });

    // Plugin-Code bundeln
    const ctx = await esbuild.context({
        entryPoints: ["src/code.js"],
        bundle: true,
        outfile: "dist/code.js",
        platform: "browser",
        target: ["es2018"],
        sourcemap: true,
    });

    // ui.html kopieren
    fs.copyFileSync(path.resolve("src/ui.html"), path.resolve("dist/ui.html"));

    if (watch) {
        console.log("👀 Watching for changes...");
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log("✅ Build fertig!");
    }
}

const watchMode = process.argv.includes("--watch");
build(watchMode).catch((e) => {
    console.error(e);
    process.exit(1);
});
