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

    it( "should load a shield", function ( done )
    {
        agent
            .get( "/vokal/cvr-view-test/shield.svg" )
            .expect( 200, done );
    } );

    it( "should 404 a shield on non-existing repo", function ( done )
    {
        agent
            .get( "/vokal/notthedroidsyouarelookingfor/shield.svg" )
            .expect( 404, done );
    } );
};
