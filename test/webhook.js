"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );
var fs = require( "fs" );

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

    it( "should reject a non-PR request", function ( done )
    {
        request( server )
            .post( "/webhook" )
            .expect( 202 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Not a pull request" );
                done( err );
            } );
    } );

    it( "should accept a sync hook", function ( done )
    {
        request( server )
            .post( "/webhook" )
            .set( "Content-Type", "application/json" )
            .send( fs.readFileSync( "./test/assets/webhook-synchronize.json" ).toString() )
            .expect( 201 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Created status" );
                done( err );
            } );
    } );

    it( "should skip when title contains [ci skip]", function ( done )
    {
        var hook = JSON.parse( fs.readFileSync( "./test/assets/webhook-synchronize.json" ).toString() );
        hook.pull_request.title += "[ci skip]";

        request( server )
            .post( "/webhook" )
            .set( "Content-Type", "application/json" )
            .send( JSON.stringify( hook ) )
            .expect( 202 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Commit skipped by [ci skip], pending status not set" );
                done( err );
            } );
    } );
};
