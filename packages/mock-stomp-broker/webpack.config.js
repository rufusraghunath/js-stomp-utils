const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  externals: ["bufferutil", "utf-8-validate"],
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js", ".json"]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  }
};
