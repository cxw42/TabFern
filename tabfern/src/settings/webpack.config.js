// webpack.config.js for TabFern Settings
// cxw42 2018 - CC-BY-SA 3.0 or 4.0 (or any later version) at your option
// Thanks to:
// - https://stackoverflow.com/a/43005332/2877364 by
//  https://stackoverflow.com/users/7571861/ollie-cee
// - https://github.com/KimberleyCook/webpack-tutorial
// - https://github.com/webpack-contrib/extract-text-webpack-plugin/issues/493

// Can't use script-loader because it requires `eval` -
// https://github.com/webpack-contrib/script-loader/issues/39

// Can't use ExtractTextWebpackPlugin yet

const webpack = require('webpack');
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
//var ExtractTextPlugin = require("extract-text-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

var config_HTMLWebpackPlugin = new HtmlWebpackPlugin({
    filename: 'index.html', //output name

    template: 'index.template.html',
    title: 'TabFern Settings',
    favicon: '../../assets/fern16.png',
});

//var config_ExtractTextPlugin = new ExtractTextPlugin({
//    filename: 'styles.css'
//});

var config_MiniCssExtractPlugin = new MiniCssExtractPlugin();

//var config_CommonsChunkPlugin = new webpack.optimize.CommonsChunkPlugin({
//    name: 'vendor',
//    filename: 'vendor.bundle.js'
//});

module.exports = {
    mode: 'none',

    output: {
        path: path.resolve('../settings-packed'),
        pathinfo: true,
        publicPath: '/src/settings-packed/'
    },

    entry: {
//        vendor:
//            [
//            'script-loader!../common/validation.js',
//            'script-loader!../common/common.js',
//            'script-loader!../../js/loglevel.js',
//            'script-loader!../../js/spin-packed.js',
//
//            'script-loader!../../js/tinycolor.js',
//            'script-loader!../../js/import-file.js',
//            'script-loader!../../js/export-file.js',
//
//            'script-loader!./lib/mootools-core.js',   // now $ is mootools
//            'script-loader!./lib/store.js',
//            'script-loader!./js/classes/tab.js',
//            'script-loader!./js/classes/setting.js',
//            'script-loader!./js/classes/search.js',
//            'script-loader!./js/classes/fancy-settings.js',
//
//            'script-loader!./i18n.js',
//            'script-loader!./js/i18n.js',
//            'script-loader!./manifest.js',
//
//            'script-loader!../../js/jquery.js',          // now $ is jQuery
//            'script-loader!../../js/spectrum.js',
//            'script-loader!../../js/jquery-noconflict.js',
//                // now $ is back to mootools - use jQuery() instead of $
//            ], //vendor
        app: './webpack-main.js',
    },

    resolve: {
        alias: {
            jquery: path.resolve('../../js/jquery.js'),
        },
    },

    module: {
        rules: [

//            // from https://github.com/jquery/jquery-migrate/issues/273#issuecomment-332527584
//            // but doesn't work
//            {
//                test: require.resolve("jquery-migrate"),
//                use: "imports-loader?define=>false",
//            },

            // from https://github.com/webpack/webpack/issues/3017#issuecomment-285954512
            { parser: { amd: false } },

            {
                test: /\.css$/,
                use: [{loader: MiniCssExtractPlugin.loader}, 'css-loader'],
//                use: ['style-loader','css-loader'],
//                //fallback: 'style-loader',
//                use: ExtractTextPlugin.extract({
//                    use: [{
//                        loader: 'css-loader',
//                    }]
//                    fallback: 'style-loader',
//                    use: ['css-loader'],
//                }),
            },
            {
                test: /\.(ttf|woff2?|eot|svg)$/,
                loader: 'file-loader?name=[name].[ext]',
            },
        ],
//      loaders: [
//          {
//              test: /\.css$/,
//              loader: ExtractTextPlugin.extract('style-loader','css-loader'),
//          },

//        {
//          test: /\.js$/,
//          include:  __dirname + '/app',
//          loader: 'babel?presets[]=es2015',
//        }
//      ]
    },
    plugins: [
        //config_CommonsChunkPlugin,
        config_HTMLWebpackPlugin,
        config_MiniCssExtractPlugin,
    ],
}


// vi: set ts=4 sts=4 sw=4 et ai fo=cql: //
