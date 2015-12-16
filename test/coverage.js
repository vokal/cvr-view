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

    it( "should validate posting coverage", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "commit is required" );
                done( err );
            } );
    } );

    it( "should validate repo", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "token or owner and repo are required" );
                done( err );
            } );
    } );

    it( "should validate token", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "token", "123" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Token is not registered" );
                done( err );
            } );
    } );

    it( "should validate repo", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Cannot find repo by owner and repo name" );
                done( err );
            } );
    } );

    it( "should validate coverage has content", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .attach( "coverage", "test/assets/empty.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "coverage is empty" );
                done( err );
            } );
    } );
};
