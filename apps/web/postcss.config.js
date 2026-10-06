// CommonJS PostCSS config. In a workspace monorepo this resolves the plugins
// reliably from the hoisted root node_modules via Node's upward resolution.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
