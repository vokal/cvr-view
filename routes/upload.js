"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

var lcovFnMatch = "^FN:[0-9]\\{1,\\},([a-zA-Z0-9_]\\{1,\\})$";
var gocoverMatch = "^[a-zA-Z/]\\{1,\\}\\.go:[0-9]\\{1,\\}\\.[0-9]\\{1,\\},[0-9]\\{1,\\}\\.[0-9]\\{1,\\} [0-9]\\{1,\\} [0-9]\\{1,\\}$";

module.exports = function ( req, res, next )
{
    res.set( "Content-Type", "text/plain" );
    res.render( "upload", {
        lcovRegex: lcovFnMatch,
        gocovRegex: gocoverMatch,
        proto: req.protocol,
        host: req.hostname
    } );
};
