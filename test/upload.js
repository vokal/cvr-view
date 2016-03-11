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

    it( "should exist", function ( done )
    {
        agent
            .get( "/upload" )
            .expect( 200, done );
    } );
};
