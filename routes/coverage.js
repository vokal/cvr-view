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
            return res.status( 400 ).send( err.message );
        }

        return res.status( 201 ).send( "Saved coverage" );
    };

    var captureOn = req.body.commit ? req.body : req.query;

    var options = {
        token: captureOn.token,
        owner: captureOn.owner,
        repo: captureOn.repo,
        removePath: captureOn.removepath,
        prependPath: captureOn.prependpath
    };

    var coverage = req.files && req.files.coverage
        ? req.files.coverage.buffer.toString()
        : captureOn.coverage;

    if( !captureOn.commit )
    {
        return res.status( 400 ).send( "Commit is required" );
    }

    if( !( options.token || options.owner && options.repo ) )
    {
        return res.status( 400 ).send( "Token or owner and repo are required" );
    }

    if( !coverage )
    {
        return res.status( 400 ).send( "Coverage is empty" );
    }

    return saveCoverage( captureOn.commit, coverage,
        captureOn.coveragetype || "lcov", options, onCoverageSaved );
};

var saveCoverage = function ( hash, coverage, coverageType, options, callback )
{
    var repo = null;
    var hashes = [];
    var commit = null;
    var cov = null;
    var auth = null;
    var gitHubOauthToken = null;

    if( [ "lcov", "cobertura", "jacoco", "gocover" ].indexOf( coverageType ) === -1 )
    {
        return callback( new Error( "Coverage type not valid" ) );
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

            var getPriorHashOnMaster = function ( indexOfCurrent )
            {
                for( var i = indexOfCurrent + 1; i < hashes.length; i++ )
                {
                    if( !hashes[ i ].isPullRequest )
                    {
                        return hashes[ i ];
                    }
               }

               return null;
            };

            priorHash = getPriorHashOnMaster( indexOfCurrent );
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

        cvr.gitHub.createStatus( gitHubOauthToken, status, function ( err )
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

        var linesFound = 0;
        var linesHit = 0;

        cov.forEach( ( c ) =>
        {
            linesFound += c.lines.found;
            linesHit += c.lines.hit;
        } );

        repo.lastLinesFound = linesFound;
        repo.lastLinesHit = linesHit;

        var updateCommit = function ()
        {
            commit.coverage = coverage;
            commit.linePercent = linePercent;
            commit.linesFound = linesFound;
            commit.linesHit = linesHit;
            commit.created = new Date();
        };

        if( commit )
        {
            updateCommit();
            commit.save( callback );
        }
        else
        {
            var isPullRequest = false;

            github.pullRequests.getAll( {
                user: repo.owner,
                repo: repo.name
            }, function ( err, prs )
            {
                if( err )
                {
                    // log and continue so at least coverage is saved
                    console.log( "Unable to get PRs for " + repo.owner + "/" + repo.name
                        + " as " + auth.username + ", user's oauth token may have expired: " + err );
                }
                else
                {
                    isPullRequest = !err && prs && prs.some( function ( pr )
                    {
                        return pr.head.sha === hash;
                    } );
                }

                commit = new models.Commit( {
                    repo: {
                        owner: repo.owner,
                        name: repo.name,
                        fullName: repo.fullName,
                        provider: repo.provider
                    },
                    hash: hash,
                    coverageType: coverageType,
                    isPullRequest: isPullRequest
                } );

                updateCommit();

                models.Commit.pushCommit( commit, callback );
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
                if( options.token )
                {
                    return done( new Error( "Token is not registered" ) );
                }
                return done( new Error( "Cannot find repo by owner and repo name" ) );
            }

            // query param options take precedence over saved settings
            var removePath = options.removePath || repo.removePath;
            if( removePath )
            {
                coverage = cvr.removePath( coverage, removePath );
            }

            var prependPath = options.prependPath || repo.prependPath;
            if( prependPath )
            {
                coverage = cvr.prependPath( coverage, prependPath, coverageType );
            }

            models.User.getTokenForRepoFullName( repo.fullName, done );
        },
        function ( tokenRes, done )
        {
            auth = tokenRes ? tokenRes.oauth : null;
            gitHubOauthToken = tokenRes ? tokenRes.oauth.token : null;

            github.authenticate( {
                type: "oauth",
                token: gitHubOauthToken
            } );

            github.repos.getCommits( {
                owner: repo.owner,
                repo: repo.name,
                sha: hash
            }, function ( err, commits )
            {
                if( err )
                {
                    return done( new Error( "The commit " + hash + " does not exist" ) );
                }

                models.Commit.findCommitList( repo.owner, repo.name, done );
            } );
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
        saveCommit();
        setCommitStatus();
    } );

};
