const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Bundle the extension entry point. better-sqlite3 is kept external because
 * it contains native bindings that esbuild cannot bundle.
 */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode', 'sql.js'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(extensionConfig);
    await ctx.watch();
    console.log('Watching extension...');
  } else {
    await esbuild.build(extensionConfig);
    console.log('Built out/extension.js');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
