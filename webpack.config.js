module.exports = {
    mode: "production",
    entry: "./src/main.ts",
    output: {
      filename: "webrtc-shim.min.js"
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"]
    },
    module: {
      rules: [
        { test: /\.tsx?$/, loader: "ts-loader" }
      ]
    }
  };