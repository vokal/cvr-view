"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );
var a = require( "async" );
var githubApi = require( "github" );
var github = new githubApi( {
    version: "3.0.0"
} );

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
        isPullRequest: !!captureOn.ispullrequest,
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
    var repo = null;
    var hashes = [];
    var commit = null;
    var cov = null;
    var gitHubOauthToken = null;

    if( [ "lcov", "cobertura", "jacoco", "gocover" ].indexOf( coverageType ) === -1 )
    {
        return callback( new Error( "Coverage Type not valid" ) );
    }

    if( !coverage )
    {
        return callback( new Error( "Coverage is empty" ) );
    }

    var setCommitStatus = function ()
    {
        if( !gitHubOauthToken )
        {
            return;
        }

        var linePercent = cvr.getLineCoveragePercent( cov );
        var passing = linePercent >= repo.minPassingLinePercent;
        var newStatus = passing ? "success" : "failure";
        var newDescription = linePercent.toFixed( 2 ) + "% line coverage.";

        if( !passing )
        {
            newDescription += " Requires " + repo.minPassingLinePercent + "%. ";
        }

        var priorHash = null;

        if( hashes.length )
        {
            var indexOfCurrent = hashes.lastIndexOf( function ( compare )
            {
                return compare.hash === hash;
            } );

            priorHash = indexOfCurrent === -1
                ? hashes[ 0 ]
                : hashes.length > indexOfCurrent + 1
                    ? hashes[ indexOfCurrent + 1 ]
                    : null;
        }

        if ( priorHash )
        {
            var changeDiff = linePercent > priorHash.linePercent ? "+" : "";
            var covDiff = linePercent - priorHash.linePercent;

            newDescription += " " + changeDiff + covDiff.toFixed( 2 ) + "% change.";
        }
        else
        {
            newDescription += " No prior coverage.";
        }
        var status = {
            user: repo.owner,
            repo: repo.name,
            sha: hash,
            state: newStatus,
            context: "cvr",
            description: newDescription,
            target_url: env.host + "repo/" + repo.owner + "/" + repo.name + "/" + hash
        };

        cvr.createGitHubStatus( gitHubOauthToken, status, function ( err )
            {
                // another silent failure?
                if( err )
                {
                    console.log( err.message );
                }
            } );
    };

    var saveCommit = function ()
    {
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
            github.authenticate( {
                type: "oauth",
                token: gitHubOauthToken
            } );

            github.pullRequests.getAll( {
                user: repo.owner,
                repo: repo.name
            }, function ( err, prs )
            {
                // Fine is someone wants to override isPullRequest explicitly in the request
                var isPullRequest = options.isPullRequest;

                if( !isPullRequest && !err && prs )
                {
                    isPullRequest = prs.some( function ( pr )
                    {
                        return pr.head.sha === hash;
                    } );
                }

                var newCommit = new models.Commit( {
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
                    isPullRequest: isPullRequest,
                    created: new Date()
                } );

                models.Commit.pushCommit( newCommit, callback );
            } );
        }

        repo.save( function ( err )
        {
            if( err )
            {
                console.log( err );
            }
        });
    };

    a.waterfall( [
        function ( done )
        {
            if( options.token )
            {
                models.Repo.findByToken( options.token, done );
            }
            else
            {
                models.Repo.findByOwnerAndName( options.owner, options.repo, done );
            }
        },
        function ( $repo, done )
        {
            repo = $repo;

            if( !repo )
            {
                return done( new Error( "Token is not registered" ) );
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

            models.Commit.findCommitList( repo.owner, repo.name, done );
        },
        function ( $hashes, done )
        {
            hashes = $hashes;
            models.Commit.findCommit( repo.owner, repo.name, hash, done );
        },
        function ( $commit, done )
        {
            commit = $commit;
            cvr.getCoverage( coverage, coverageType, done );
        },
        function ( $cov, done )
        {
            cov = $cov;
            done();
        }
    ], function ( err )
    {
        if( err )
        {
            return callback( err );
        }
        models.User.getTokenForRepoFullName( repo.fullName, function ( err, tokenRes )
        {
            gitHubOauthToken = tokenRes ? tokenRes.oauth.token : null;
            saveCommit();
            setCommitStatus();

            if( err )
            {
                console.log( err.message );
            }
        } );
    } );

};