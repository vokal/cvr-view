"use strict";

var models = require( "../lib/models" );
var uuid = require( "node-uuid" );

module.exports = function ( req, res, next )
{
    var onRepo = function ( err, repo )
    {
        if( err )
        {
            return next( err );
        }

        repo.token = uuid.v4().replace( /-/g, "" );
        repo.save( function ()
        {
            return res.redirect( "/repo/" + req.params.owner + "/" + req.params.name );
        }, next );
    };

    models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
};
