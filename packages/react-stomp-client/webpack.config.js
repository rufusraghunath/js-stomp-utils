const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  externals: ["react"],
  devtool: "source-map",
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
    libraryTarget: "umd",
    libraryExport: "default",
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  }
};
