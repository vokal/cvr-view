"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );
var fs = require( "fs" );
var nock = require( "nock" );

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should reject a non-PR request", function ( done )
    {
        agent
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
        nock( "https://api.github.com" )
            .post( "/repos/vokal/cvr-view-test/statuses/558bc5aa45d591b3cdfea80af29e7ffb66ff55f1?access_token=test" )
            .reply( 201 );

        agent
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

        agent
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
