"use strict";

var app = require( "../app" );
var port = 3030;
var server = null;

module.exports = function ( done )
{
    if( server )
    {
        return done( null, server );
    }

    server = app.listen( port, function ( err )
    {
        console.log( "CVR test server listening at port %s", server.address().port );
        done( err, server );
    } );
};
