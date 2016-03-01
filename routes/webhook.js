"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
{
    var oauth;
    var status;

    var onSetPending = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( "Unable to set pending status to "
                + status.user + "/" + status.repo + "/" + status.sha + " as "
                + oauth.username
                + ", user's oauth token may have expired, not have push access for the repo, "
                + "or the sha may not exist: " + err );
        }

        return res.status( 201 ).send( "Created status" );
    };

    var pr = req.body.pull_request;
    var action = req.body.action;

    if( !pr || [ "opened", "synchronize" ].indexOf( action ) === -1 )
    {
        return res.status( 202 ).send( "Not a pull request" );
    }

    var title = pr.title;

    if( title.indexOf( "[ci skip]" ) >= 0 || title.indexOf( "[skip ci]" ) >= 0 )
    {
        return res.status( 202 ).send( "Commit skipped by [ci skip], pending status not set" );
    }

    var onGotAccessToken = function ( err, tokenRes )
    {
        if( err || !tokenRes || !tokenRes.oauth.token )
        {
            return res.status( 400 ).send( "No permission to set status on " + pr.base.repo.full_name );
        }

        oauth = tokenRes.oauth;

        status = {
            user: pr.base.user.login,
            repo: pr.base.repo.name,
            sha: pr.head.sha,
            state: "pending",
            context: "cvr",
            description: "code coverage pending"
        };

        cvr.gitHub.createStatus( oauth.token, status, onSetPending );
    };

    models.User.getTokenForRepoFullName( pr.base.repo.full_name, onGotAccessToken );
};
