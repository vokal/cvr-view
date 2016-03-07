"use strict";

var hbs = require( "hbs" );
var moment = require( "moment" );

module.exports = hbs;

hbs.registerHelper( "json", function ( context )
{
    return JSON.stringify( context );
} );

hbs.registerHelper( "commitStatus", function ( linePercent, minPassingLinePercent )
{
    if( linePercent === undefined )
    {
        return "";
    }
    return linePercent >= minPassingLinePercent ? "passing" : "failing";
} );

hbs.registerHelper( "fileStatus", function ( linePercent, minPassingLinePercent )
{
    return linePercent === 100
        ? "passing"
        : linePercent < minPassingLinePercent
            ? "failing"
            : "";
} );

hbs.registerHelper( "commitPercentFormatted", function ( linePercent )
{
    return linePercent ? linePercent.toFixed( 0 ) + "%" : "";
} );

hbs.registerHelper( "linePercentFormatted", function ( linePercent )
{
    return linePercent ? linePercent.toFixed( 2 ) + "%" : "";
} );

hbs.registerHelper( "numberFormatted", function ( num )
{
    return num.toLocaleString();
} );

hbs.registerHelper( "age", function ( date )
{
    return moment( date ).fromNow();
} );

hbs.registerHelper( "pathFormat", function ( path )
{
    return path.replace( /\//g, " / " );
});

hbs.registerHelper( "trimPathFormat", function ( path )
{
    var parts = path.split( "/" );
    var trimParts = parts.slice( -3 );
    trimParts = trimParts.map( function ( part )
    {
        if( part.length > 30 )
        {
            return part.slice( 0, 14 ) + "..." + part.slice( -14 );
        }
        return part;
    });

    return ( parts.length > trimParts.length ? "... / " : "" ) + trimParts.join( " / " );
});
