"use strict";

var path = require( "path" );

var cvrView = {
    env: require( "./lib/env" ),
    routes: require( "./routes/index" ),
    hbs: require( "./lib/hbs" ),
    passport: require( "./lib/passport" ),
    viewsPath:  path.join( __dirname, "views" ),
    publicPath:  path.join( __dirname, "public" )
};

module.exports = cvrView;
