const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  externals: ["react"], // TODO: should include lodash.isempty?
  module: {
    rules: [
      {
        test: /\.(tsx|ts)?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json", ".node"]
  },
  output: {
    library: "StompClient",
    libraryTarget: "umd", // TODO: this should be browser only?
    libraryExport: "default",
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  }
};
