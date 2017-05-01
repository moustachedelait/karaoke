const path = require('path');

module.exports = {
  entry: path.join(__dirname, 'app'),
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js',
  },
  devtool: 'source-map',
  module: {
    rules: [{
      test: /\.(js|mjs)$/,
      exclude: /node_modules/,
      use: 'babel-loader',
    }],
  },
};
