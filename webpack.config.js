/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const webpack = require("webpack");

const package = require('./package.json')

const config = {
    mode: "development",
    output: {
      path: path.resolve(__dirname, "dist/electron-workspace"),
      filename: "[name].js"
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".json"],
    },
    module: {
      rules: [
        { test: /\.node$/, loader: "native-ext-loader" },
        { test: /\.tsx?$/, use: ["ts-loader"], exclude: /node_modules/ }
      ]
    }
};

const mainConfig = {
    ...config,
    name: "main-dev",
    entry: {
      main: "./src/main/index.ts",
    },
    plugins: [
      new webpack.DefinePlugin({
          DIST: false,
          VERSION: JSON.stringify(package.version),
          APP_ID: JSON.stringify(package.appId)
      })
    ],
    node: {
      __dirname: false
    },
    target: "electron-main"
};

const mainConfigDist = {
  ...config,
  mode: "production",
  name: "main-dist",
  entry: {
    main: "./src/main/index.ts",
  },
  plugins: [
    new webpack.DefinePlugin({
        DIST: true,
        VERSION: JSON.stringify(package.version),
        APP_ID: JSON.stringify(package.appId)
    })
  ],
  node: {
    __dirname: false
  },
  target: "electron-main"
};

const rendererConfig = {
    ...config,
    name: "renderer-dev",
    entry: {
      renderer: "./src/renderer/index.ts"
    },
    plugins: [
      new webpack.DefinePlugin({
          DIST: false,
          VERSION: JSON.stringify(package.version),
          APP_ID: JSON.stringify(package.appId)
      })
    ],
    target: "electron-renderer"
};

const rendererConfigDist = {
  ...config,
  mode: "production",
  name: "renderer-dist",
  entry: {
    renderer: "./src/renderer/index.ts"
  },
  plugins: [
    new webpack.DefinePlugin({
        DIST: true,
        VERSION: JSON.stringify(package.version),
        APP_ID: JSON.stringify(package.appId)
    })
  ],
  target: "electron-renderer"
};

const unitTestsConfig = {
  ...config,
  output: {
    path: path.resolve(__dirname, "test/bin"),
    filename: "[name].js"
  },
  name: "unitTests",
  entry: {
    unitTests: "./test/unit/index.ts"
  },
  plugins: [
    new webpack.DefinePlugin({
        DIST: false,
        VERSION: JSON.stringify(package.version),
        APP_ID: JSON.stringify(package.appId)
    })
  ],
  target: "node" 
};

module.exports = [ mainConfig, mainConfigDist, rendererConfig, rendererConfigDist, unitTestsConfig ];