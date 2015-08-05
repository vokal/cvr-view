"use strict";

var auth = {};

module.exports = auth;

auth.ensureAuthenticated = function ( req, res, next )
{
    if ( req.isAuthenticated() )
    {
        return next();
    }
    res.cookie( "onauth", req.url );
    res.redirect( "/" );
};
