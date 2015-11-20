"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
{
    var onCoverageSaved = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( err.message ).end();
        }

        return res.status( 201 ).end();
    };

    var captureOn = req.body.commit ? req.body : req.query;

    var options = {
        token: captureOn.token,
        owner: captureOn.owner,
        repo: captureOn.repo,
        isPullRequest: captureOn.ispullrequest,
        removePath: captureOn.removepath,
        prependPath: captureOn.prependpath
    };

    var coverage = req.files && req.files.coverage
        ? req.files.coverage.buffer.toString()
        : captureOn.coverage;

    if( captureOn.commit && coverage && ( options.token || options.owner && options.repo ) )
    {
        return saveCoverage( captureOn.commit, coverage,
            captureOn.coveragetype || "lcov", options, onCoverageSaved );
    }

    res.status( 400 ).send( "Required parameters missing" ).end();
};

var saveCoverage = function ( hash, coverage, coverageType, options, callback )
{
    if( [ "lcov", "cobertura", "jacoco", "gocover" ].indexOf( coverageType ) === -1 )
    {
        return callback( new Error( "Coverage Type not valid" ) );
    }

    if( !coverage )
    {
        return callback( new Error( "Coverage is empty" ) );
    }

    var onRepo = function ( err, repo )
    {
        if( err )
        {
            return callback( err );
        }

        if( !repo )
        {
            return callback( new Error( "Token is not registered" ) );
        }

        // query param options take precedence over saved settings
        if( options.removePath )
        {
            coverage = cvr.removePath( coverage, options.removePath );
        }
        else if( repo.removePath )
        {
            coverage = cvr.removePath( coverage, repo.removePath );
        }

        if( options.prependPath )
        {
            coverage = cvr.prependPath( coverage, options.prependPath, coverageType );
        }
        else if( repo.prependPath )
        {
            coverage = cvr.prependPath( coverage, repo.prependPath, coverageType );
        }

        var onHashList = function ( err, hashes )
        {
            if( err )
            {
                return callback( err );
            }

            var onCommit = function ( err, commit )
            {
                if( err )
                {
                    return callback( err );
                }

                cvr.getCoverage( coverage, coverageType, function ( err, cov )
                {
                    if( err )
                    {
                        return callback( err );
                    }

                    var onGotAccessToken = function ( err, tokenRes )
                    {
                        // not sure how errors should be handled here yet, silent failure seems like an ok option
                        if( err )
                        {
                            console.log( err.message );
                        }

                        if( tokenRes.oauth.token )
                        {
                            var passing = linePercent >= repo.minPassingLinePercent;
                            var newStatus = passing ? "success" : "failure";
                            var newDescription = linePercent.toFixed( 2 ) + "% line coverage";

                            if( !passing )
                            {
                                newDescription += " - requires " + repo.minPassingLinePercent + "%. ";
                            }

                            if ( hashes[ 0 ] )
                            {
                                var changeDiff = linePercent > hashes[ 0 ].linePercent ? "+" : "";
                                var covDiff = linePercent - hashes[ 0 ].linePercent;

                                newDescription += " " + changeDiff + covDiff.toFixed( 2 ) + "% change.";
                            }
                            else
                            {
                                newDescription += " no prior coverage.";
                            }
                            var status = {
                                user: repo.owner,
                                repo: repo.name,
                                sha: hash,
                                state: newStatus,
                                context: "cvr",
                                description: newDescription,
                                target_url: host + "repo/" + repo.owner + "/" + repo.name + "/" + hash
                            };

                            cvr.createGitHubStatus( tokenRes.oauth.token, status, function ( err )
                                {
                                    // another silent failure?
                                    if( err )
                                    {
                                        console.log( err.message );
                                    }
                                } );
                        }
                    };

                    var linePercent = cvr.getLineCoveragePercent( cov );
                    repo.lastLinePercent = linePercent;

                    if( commit )
                    {
                        commit.coverage = coverage;
                        commit.linePercent = linePercent;
                        commit.created = new Date();
                        commit.save( callback );
                    }
                    else
                    {
                        var newCommit = new models.Commit({
                            repo: {
                                owner: repo.owner,
                                name: repo.name,
                                fullName: repo.fullName,
                                provider: repo.provider
                            },
                            hash: hash,
                            coverage: coverage,
                            linePercent: linePercent,
                            coverageType: coverageType,
                            isPullRequest: !!options.isPullRequest,
                            created: new Date()
                        });

                        models.Commit.pushCommit( newCommit, callback );
                    }

                    repo.save( function ( err )
                    {
                        if( err )
                        {
                            console.log( err );
                        }
                    });

                    models.User.getTokenForRepoFullName( repo.fullName, onGotAccessToken );
                } );
            };

            models.Commit.findCommit( repo.owner, repo.name, hash, onCommit );
        };

        models.Commit.findCommitList( repo.owner, repo.name, onHashList );

    };

    if( options.token )
    {
        models.Repo.findByToken( options.token, onRepo );
    }
    else
    {
        models.Repo.findByOwnerAndName( options.owner, options.repo, onRepo );
    }
};
