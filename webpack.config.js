const path = require('path');

module.exports = {
  entry: './src/app.js',
  devtool: 'inline-source-map',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'api/src/static/js'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};    
