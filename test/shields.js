"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );

module.exports = function ()
{
    var server;
    before( function ( done )
    {
        app( function ( err, res )
        {
             server = res;
             done( err );
        } );
    } );

    it( "should load a shield", function ( done )
    {
        request( server )
            .get( "/vokal/cvr-view-seed/shield.svg" )
            .expect( 200, done );
    } );

    it( "should 404 a shield on non-existing repo", function ( done )
    {
        request( server )
            .get( "/vokal/notthedroidsyouarelookingfor/shield.svg" )
            .expect( 404, done );
    } );
};
