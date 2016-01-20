"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
{
    var captureOn = req.body.commit ? req.body : req.query;

    var options = {
        token: captureOn.token,
        owner: captureOn.owner,
        repo: captureOn.repo,
        commit: captureOn.commit,
        reason: captureOn.reason
    };

    if( !captureOn.commit )
    {
        return res.status( 400 ).send( "Commit is required" );
    }

    var onDone = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( err );
        }

        return res.status( 201 ).send( "Status created" );
    };

    var abortPendingStatus = function ( options )
    {
        if( !options.gitHubOauthToken )
        {
            onDone( new Error( "Unable to get oauth token" ) );
        }

        var status = {
            user: options.owner,
            repo: options.repo,
            sha: options.commit,
            state: "failure",
            context: "cvr",
            description: options.reason || "coverage aborted"
        };

        cvr.createGitHubStatus( options.gitHubOauthToken, status, onDone );
    };

    var onOauthToken = function ( err, tokenRes )
    {
        if( err )
        {
            return onDone( err );
        }

        options.gitHubOauthToken = tokenRes && tokenRes.oauth ? tokenRes.oauth.token : null;
        abortPendingStatus( options );
    };

    if( options.owner && options.repo )
    {
        models.User.getTokenForRepoFullName( options.owner + "/" + options.repo, onOauthToken );
    }
    else if( options.token )
    {
        models.Repo.findByToken( options.token, function ( err, repo )
        {
            if( err )
            {
                return onDone( err );
            }

            options.owner = repo.owner;
            options.repo = repo.name;
            models.User.getTokenForRepoFullName( repo.fullName, onOauthToken );
        } );
    }
    else
    {
        return onDone( new Error( "Token or owner and repo are required" ) );
    }
};
