import esbuild from 'esbuild';
const watch = process.argv.includes('--watch');
const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: !watch,
  format: 'iife',
  globalName: 'ChatbotX',
  outfile: 'dist/widget.v1.js',
  platform: 'browser',
  target: ['es2020', 'chrome80', 'firefox80', 'safari13'],
});
if (watch) { await ctx.watch(); console.log('Watching...'); }
else { await ctx.rebuild(); await ctx.dispose(); console.log('Built dist/widget.v1.js'); }
