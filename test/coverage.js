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
                assert.equal( res.text, "Commit is required" );
                done( err );
            } );
    } );

    it( "should validate repo is required", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Token or owner and repo are required" );
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

    it( "should validate repo exists under owner", function ( done )
    {
        this.timeout( 5000 );

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
                assert.equal( res.text, "Coverage is empty" );
                done( err );
            } );
    } );

    it( "should validate coverage has a valid type", function ( done )
    {
        request( server )
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .field( "coveragetype", "not a real thing" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Coverage type not valid" );
                done( err );
            } );
    } );

    it( "should save coverage", function ( done )
    {
        this.timeout( 10000 );

        request( server )
            .post( "/coverage" )
            .field( "commit", "627786ba8f153d46e808c9b6c2755fa5ce38de6d" )
            .field( "owner", "vokal" )
            .field( "repo", "cvr-view" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 201 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Saved coverage" );
                done( err );
            } );
    } );

    it( "should abort pending coverage", function ( done )
    {
        request( server )
            .post( "/coverage/abort" )
            .field( "commit", "627786ba8f153d46e808c9b6c2755fa5ce38de6d" )
            .field( "owner", "vokal" )
            .field( "repo", "cvr-view" )
            .field( "reason", "This was a test" )
            .expect( 201 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Status created" );
                done( err );
            } );
    } );
};
