SystemJS.config({
  paths: {
    "*": "node_modules/*",
    "build/": "build/",
    "src/": "src/",
    "christmasxpfireworks/": "src/"
  },
  packageConfigPaths: [
    "*/package.json",
    "@webcomponents/*/package.json"
  ],
  transpiler: "systemjs-plugin-babel",
  meta: {
    "*.js": {
      "babelOptions": {
        "es2015": false
      }
    }
  }
});
