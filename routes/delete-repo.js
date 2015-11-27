"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );

module.exports = function ( req, res, next )
{
    var onRemove = function ( err )
    {
        if( err )
        {
            return next( err );
        }

        cvr.deleteGitHubHook( req.session.user.token,
            req.params.owner, req.params.name, env.host + "webhook", function ( err )
        {
            if( err )
            {
                console.log( "failed to delete GitHub hook" );
            }
        } );

        return res.redirect( "/repos" );
    };

    models.Repo.removeByOwnerAndName( req.params.owner, req.params.name, onRemove );
};
