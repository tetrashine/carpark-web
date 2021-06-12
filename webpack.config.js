const path = require('path');
const webpack = require('webpack');

const PATHS = {
    build: path.resolve(__dirname, "build"),
    src: path.join(__dirname, 'src'),
}

module.exports = {
    mode: 'development',
    name: 'carpark-web',
    entry: './src/index',
    output: {
        path: PATHS.build,
        filename: 'bundle.js',
    },
    resolve: {
        modules: [
            "node_modules",
            PATHS.src,
        ],
        extensions: ['.js', '.jsx']
    },
    module: {
        rules: [{
            test: /\.jsx?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            options: {
                presets: ['@babel/preset-env', '@babel/preset-react']
            }
        }]
	},
    devServer: {
        contentBase: PATHS.build,
        compress: true,
        port: 8080,
    },
    devtool: 'eval-source-map',
};