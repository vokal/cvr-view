"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should have a 404 page", function ( done )
    {
        agent
            .get( "/this/is/not/a/page" )
            .expect( 404 )
            .end( done );
    } );
};
