"use strict";

var hbs = require( "../lib/hbs" );
var assert = require( "assert" );
var helpers = hbs.handlebars.helpers;

module.exports = function ()
{
    it( "should have json helper", function ()
    {
        assert.equal( helpers.json( { a: "1" } ), "{\"a\":\"1\"}" );
    } );

    it( "should have commitStatus helper", function ()
    {
        assert.equal( helpers.commitStatus( undefined ), "" );
        assert.equal( helpers.commitStatus( 50, 50 ), "passing" );
        assert.equal( helpers.commitStatus( 49, 50 ), "failing" );
    } );

    it( "should have fileStatus helper", function ()
    {
        assert.equal( helpers.fileStatus( 100 ), "passing" );
        assert.equal( helpers.fileStatus( 50, 50 ), "" );
        assert.equal( helpers.fileStatus( 49, 50 ), "failing" );
    } );

    it( "should have commitPercentFormatted helper", function ()
    {
        assert.equal( helpers.commitPercentFormatted( 100 ), "100%" );
        assert.equal( helpers.commitPercentFormatted( 0 ), "" );
        assert.equal( helpers.commitPercentFormatted( undefined ), "" );
    } );

    it( "should have linePercentFormatted helper", function ()
    {
        assert.equal( helpers.linePercentFormatted( 100 ), "100.00%" );
        assert.equal( helpers.linePercentFormatted( 0 ), "" );
        assert.equal( helpers.linePercentFormatted( undefined ), "" );
    } );

    it( "should have age helper", function ()
    {
        var d = new Date();
        assert.equal( helpers.age( d ), "a few seconds ago" );
    } );

    it( "should have pathFormat helper", function ()
    {
        assert.equal( helpers.pathFormat( "some/path" ), "some / path" );
    } );

    it( "should have trimPathFormat helper", function ()
    {
        assert.equal( helpers.trimPathFormat( "some/extra/long/path" ), "... / extra / long / path" );
        assert.equal( helpers.trimPathFormat( "some/extra/long/path/withareallylongfilenameattheendofit.html" ),
            "... / long / path / withareallylon...heendofit.html" );
    } );
};
