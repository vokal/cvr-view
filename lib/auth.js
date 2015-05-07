var auth = {};

module.exports = auth;

auth.ensureAuthenticated = function( req, res, next )
{
    if ( req.isAuthenticated() )
    {
        return next();
    }
    res.redirect('/')
}
