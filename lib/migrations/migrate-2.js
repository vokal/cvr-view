"use strict";

var models = require( "../models" );
var cvr = require( "cvr" );

module.exports = function ()
{
    models.Repo.find( {} ).exec( function ( err, repos )
    {
        repos.forEach( function ( repo )
        {
            models.Commit.find( { "repo.owner": repo.owner, "repo.name": repo.name } )
                .sort( "-created" )
                .limit( 1 )
                .exec( function ( err, commits )
                {
                    var commit = commits[ 0 ];

                    if( commit )
                    {
                        cvr.getCoverage( commit.coverage, commit.coverageType, function ( err, cov )
                        {
                            var linesFound = 0;
                            var linesHit = 0;

                            cov.forEach( ( c ) =>
                            {
                                linesFound += c.lines.found;
                                linesHit += c.lines.hit;
                            } );

                            repo.lastLinesFound = linesFound;
                            repo.lastLinesHit = linesHit;

                            commit.linesFound = linesFound;
                            commit.linesHit = linesHit;

                            commit.save();
                            repo.save();

                            console.log(repo);
                        } );
                    }
                } );
        });
    });
};
