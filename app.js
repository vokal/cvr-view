"use strict";

var express = require( "express" );
var path = require( "path" );
var favicon = require( "serve-favicon" );
var logger = require( "morgan" );
var cookieParser = require( "cookie-parser" );
var bodyParser = require( "body-parser" );
var multer = require( "multer" );
var session = require( "express-session" );
var flash = require( "connect-flash" );

var cvrView = require( "./index" );

var app = express();

// proxy setup
app.set( "trust proxy", true );

// view engine setup
app.set( "views", cvrView.viewsPath );
app.set( "view engine", "html" );
app.engine( "html", cvrView.hbs.__express );


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + "/public/favicon.ico" ));
app.use( logger( "dev" ));
app.use( bodyParser.json({ limit: "5mb" }));
app.use( bodyParser.urlencoded({ extended: false, limit: "5mb" }));
app.use( multer({ inMemory: true }));
app.use( cookieParser());
app.use( require( "less-middleware" )( path.join( __dirname, "public" )));
app.use( express.static( path.join( __dirname, "public" )));

// session
app.use( session({
  secret: "adflkjaguadfnaadfjdfkKDJDFLSHsjkfh49584309dfjdfd"
}));
app.use( cvrView.passport.initialize() );
app.use( cvrView.passport.session() );
app.use( flash() );


// routing
app.use( "/", cvrView.routes );

// catch 404 and forward to error handler
app.use( function ( req, res, next )
{
    var err = new Error( "Not Found" );
    err.status = 404;
    next( err );
});

// error handler
app.use( function ( err, req, res, next )
{
  res.status( err.status || 500 );
  res.render( "error", {
    message: err.message,
    error: app.get( "env" ) === "development" ? err : {},
    layout: "layout.html",
    authed: req.isAuthenticated()
  });
});


module.exports = app;
