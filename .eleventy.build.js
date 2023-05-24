const esbuild = require("esbuild");
const sassPlugin = require("esbuild-sass-plugin");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
const imageminPlugin = require("esbuild-plugin-imagemin");
const purgecss = require("@fullhuman/postcss-purgecss");
const globPlugin = require("esbuild-plugin-glob");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

/*
 * Configurations
 * --------------- */
// input paths
const sass_paths = ["node_modules/@fortawesome/fontawesome-free/scss"];
const inpt_pags = "src/pages";
const inpt_html = ["src/pages/**/*.html", "src/pages/**/*.njk"];
const inpt_js = "src/assets/js/index.js";
const inpt_sass = "src/assets/scss/style.scss";
const inpt_imgs = "src/assets/img/**/*.{png,jpg,jpeg,gif,svg}";
const inpt_pdf = "src/assets/pdf/**/*";
const targt_brws = ["chrome58", "firefox57", "safari11", "edge16"];

// output paths
const dist_root = "www";
const dist_js = "www/assets/js";
const dist_css = "www/assets/css";
const dist_imgs = "www/assets/img";
const dist_pdf = "www/assets/pdf";
const js_bndl_name = "bundle";
const css_bndl_name = "style";

/*
 * Clean dist_root directory before proceeding
 * ----------------------------------------- */
try {
  fs.rmSync(dist_root, {
    recursive: true,
    force: false,
  });
  console.log(`${dist_root} folder is cleaned.`);
} catch (err) {
  console.log(`${dist_root} folder is already clean`);
}

module.exports = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", async () => {
    /*
     * Prepare javascript file
     * ----------------------- */
    await esbuild.build({
      entryPoints: [{ out: js_bndl_name, in: inpt_js }],
      outdir: dist_js,
      bundle: true,
      write: true,
      metafile: true,
      minify: true,
      target: targt_brws,
    });

    /*
     * Prepare sass file
     * ----------------------- */
    await esbuild.build({
      entryPoints: [{ out: css_bndl_name, in: inpt_sass }],
      outdir: dist_css,
      bundle: true,
      write: true,
      metafile: true,
      minify: true,
      loader: {
        ".png": "file",
        ".woff": "file",
        ".woff2": "file",
        ".eot": "file",
        ".ttf": "file",
        ".svg": "file",
      },
      plugins: [
        sassPlugin.sassPlugin({
          loadPaths: sass_paths,
          async transform(source) {
            const { css } = await postcss([
              purgecss({
                content: inpt_html,
              }),
              autoprefixer,
            ]).process(source, {
              from: inpt_sass,
            });
            return css;
          },
        }),
      ],
    });

    /*
     * Process images
     * ----------------------- */
    await esbuild.build({
      entryPoints: [inpt_imgs],
      outdir: dist_imgs,
      assetNames: "[name]",
      bundle: false,
      write: true,
      metafile: true,
      plugins: [globPlugin.globPlugin(), imageminPlugin()],
    });

    /*
     * Move PDF files to the output directory
     * ----------------------- */
    const pdfFiles = glob.sync(inpt_pdf, { nodir: true });

    for (const file of pdfFiles) {
      const dest = path.join(dist_pdf, path.relative("src/assets/pdf", file));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
    }
  });

  /*
   * Create HTML pages
   * ----------------- */
  return {
    dir: {
      input: inpt_pags,
      output: dist_root,
    },
  };
};
