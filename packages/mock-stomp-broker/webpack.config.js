const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  externals: ["bufferutil", "utf-8-validate"],
  devtool: "source-map",
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
    extensions: [".ts", ".js", ".json", ".node"]
  },
  output: {
    library: "MockStompBroker",
    libraryTarget: "umd",
    libraryExport: "default",
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  }
};
