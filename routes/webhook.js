"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
{
    var onSetPending = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( "Unable to set pending status" ).end();
        }

        return res.status( 201 ).send( "Created status" ).end();
    };

    var pr = req.body.pull_request;

    if( !pr || [ "opened", "synchronize" ].indexOf( req.body.action ) === -1 )
    {
        return res.status( 202 ).send( "Not a Pull Request" ).end();
    }

    var title = req.body.pull_request.title;

    if( title.indexOf( "[ci skip]" ) >= 0 || title.indexOf( "[skip ci]" ) >= 0 )
    {
        return res.status( 202 ).send( "Commit skipped by user, pending status not set" ).end();
    }

    var onGotAccessToken = function ( err, tokenRes )
    {
        if( err || !tokenRes || !tokenRes.oauth.token )
        {
            return res.status( 400 ).send( "No permission to set status on " + pr.base.repo.full_name ).end();
        }

        var status = {
            user: pr.base.user.login,
            repo: pr.base.repo.name,
            sha: pr.head.sha,
            state: "pending",
            context: "cvr",
            description: "code coverage pending"
        };

        cvr.createGitHubStatus( tokenRes.oauth.token, status, onSetPending );
    };

    models.User.getTokenForRepoFullName( pr.base.repo.full_name, onGotAccessToken );
};
