var express = require( "express" );
var router = express.Router();
var cvr = require( "cvr" );
var passport = require( "passport" );
var mongoose = require( "mongoose" );
var uuid = require( "uuid-lib" );

var auth = require( "../lib/auth" );
var models = require( "../lib/models" );

var dbPass = process.env.DB_PASS || require( "../local-settings.json" ).dbPass;
mongoose.connect( "mongodb://cvr:" + dbPass + "@ds031872.mongolab.com:31872/cvr" );

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  // yay!
});

router.get( "/", function( req, res, next )
{
    res.render("index", { layout: "layout.html", title: "Express" });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var username = req.session.user.profile.username;

        var onUser = function ( err, user )
        {
            if( err )
            {
                return res.status( 500 ).end();
            }

            if( !user )
            {
                user = new models.User({ oauth: {
                    provider: "github",
                    username: username
                }});
            }

            var onRepos = function ( err, repos )
            {
                user.repos = repos;
                user.save( function ( err )
                {
                    if( err )
                    {
                        return res.status( 500 ).end();
                    }

                    res.render( "repos", {
                        layout: "layout.html",
                        title: "Repos",
                        repos: user.repos } );
                });
            };

            if( user.repos.length )
            {
                onRepos( null, user.repos );
            }
            else
            {
                cvr.getGitHubRepos( req.session.user.token, function ( err, repos )
                {
                    repos = repos.map( function ( r )
                    {
                        return {
                            owner: r.owner.login,
                            name: r.name,
                            fullName: r.full_name
                        };
                    } );

                    onRepos( null, repos );
                } );
            }
        };

        var user = models.User.findOne({ "oauth.username": username }, onUser );
    } );

router.get( "/repo/:owner/:name",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        /*
        var onCommit = function ( err, commit )
        {
            //TODO: cache in DB
            req.session.commits[ owner ][ name ] = commit;
        };

        req.session.commits = req.session.commits || {};
        req.session.commits[ owner ] = req.session.commits[ owner ] || {};

        if( req.session.commits[ owner ][ name ] )
        {
            onCommit( null, req.session.repos );
        }
        else
        {
            cvr.getCommit( requ.session.token, req.params.owner, req.params.name, null, onCommit );
        }
*/

        var onRepo = function ( err, repo )
        {
            if( err )
            {
                return res.status( 500 ).end();
            }

            if( !repo )
            {
                repo = new models.Repo({
                    provider: "github",
                    owner: req.params.owner,
                    name: req.params.name,
                    fullName: req.params.owner + "/" + req.params.name,
                    token: uuid.raw()
                });
                repo.save();
            }

            if( repo.commits.length === 0 )
            {
                return res.render( "commit-activate", {
                    layout: "layout.html",
                    repo: repo } );
            }

            var commit = repo.commits[ repo.commits.length - 1 ];
            var coverage = commit.coverage;

            var onCov = function ( err, cov )
            {
                res.render( "commit", {
                    layout: "layout.html",
                    repo: repo,
                    cov: cov,
                    hash: commit.hash } );
            };

            cvr.getCoverage( coverage, "lcov", onCov );
        };

        models.Repo.findOne( { owner: req.params.owner, name: req.params.name }, onRepo );

    } );

router.get( "/repo/:owner/:name/:file(*)",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        /*
        var onCommit = function ( err, commit )
        {
            //TODO: cache in DB
            req.session.commits[ owner ][ name ] = commit;
        };

        req.session.commits = req.session.commits || {};
        req.session.commits[ owner ] = req.session.commits[ owner ] || {};

        if( req.session.commits[ owner ][ name ] )
        {
            onCommit( null, req.session.repos );
        }
        else
        {
            cvr.getCommit( requ.session.token, req.params.owner, req.params.name, null, onCommit );
        }
*/


        //TODO: DB
        var repo = repos[ 0 ];
        var commit = repo.commits[ repo.commits.length - 1 ];
        var coverage = commit.coverage;

        var onCov = function ( err, cov )
        {
            var fileCov = cvr.getFileCoverage( cov, "source/scripts/project/app.js" );

            res.render( "coverage", {
                layout: "layout.html",
                repo: repo,
                cov: cov,
                hash: commit.hash,
                extension: cvr.getFileType( req.params.file ),
                linesCovered: cvr.linesCovered( fileCov ).join( "," ),
                linesMissing: cvr.linesMissing( fileCov ).join( "," ),
                source: "/* App Configuration */\n\nangular.module( \"vokal\", [] );\n\nvalidator.extend( \"isPhone\", function ( str )\n{\n    return str.replace( /[^0-9]/g, \"\" ).length === 10;\n} );\n\nvalidator.extend( \"isPassword\", function ( str )\n{\n    return /.{8,}/.test( str ) && /[0-9]/.test( str ) && /[a-zA-Z]/.test( str );\n} );\n\nvalidator.extend( \"isUsername\", function ( str )\n{\n    return /[a-zA-Z0-9]{4,}/.test( str );\n} );\n\nvalidator.extend( \"isOldEnough\", function ( str )\n{\n    var date = new Date( str );\n    if( date.getYear() < new Date().getYear() - 95 )\n    {\n        date.setYear( 2000 + date.getYear() );\n    }\n    return Date.now() - date.getTime() > new Date( \"1/1/1983\" ).getTime();\n} );\n\nangular.module( \"trunq\", [\n    \"ngRoute\",\n    \"ngTouch\",\n    \"ngSanitize\",\n    \"ngMessages\",\n    \"ngAnimate\",\n    \"trunq.filters\",\n    \"trunq.controllers\",\n    \"trunq.services\",\n    \"trunq.directives\",\n    \"vokal.API\",\n    \"vokal.RouteAuth\",\n    \"vokal.clearable\",\n    \"vokal.appRedirect\",\n    \"LocalStorageModule\",\n    \"angularFileUpload\",\n    \"infinite-scroll\",\n    \"ngTagsInput\"\n] )\n\n.config( [ \"$routeProvider\", \"$locationProvider\", \"$sceDelegateProvider\",\n    \"APIProvider\", \"APIRoot\", \"RouteAuthProvider\", \"LoginPath\", \"AppRedirectProvider\",\n\n    function ( $routeProvider, $locationProvider, $sceDelegateProvider,\n        APIProvider, APIRoot, RouteAuthProvider, LoginPath, AppRedirectProvider )\n    {\n        \"use strict\";\n\n        var partialPath = function ( partial )\n        {\n            return \"/build/templates/partials/\" + partial;\n        };\n\n        var requireAuth = function ( RouteAuth ) { return RouteAuth.auth( [ \"user\" ] ); };\n\n        $routeProvider.when( \"/\", { templateUrl: partialPath( \"home.html\" ), controller: \"Home\" } );\n        $routeProvider.when( \"/faqs\", { templateUrl: partialPath( \"faqs.html\" ), controller: \"FAQs\" } );\n        $routeProvider.when( \"/terms\", { templateUrl: partialPath( \"terms.html\" ), controller: \"Terms\" } );\n        $routeProvider.when( \"/privacy\", { templateUrl: partialPath( \"privacy.html\" ), controller: \"Privacy\" } );\n        $routeProvider.when( \"/contact\", { templateUrl: partialPath( \"contact.html\" ), controller: \"Contact\" } );\n        $routeProvider.when( \"/register\", { templateUrl: partialPath( \"register.html\" ) } );\n        $routeProvider.when( \"/register-confirm-needed\", { templateUrl: partialPath( \"register-confirm-needed.html\" ) } );\n        $routeProvider.when( \"/sign-in\", { templateUrl: partialPath( \"sign-in.html\" ) } );\n        $routeProvider.when( \"/forgot-password\", { templateUrl: partialPath( \"forgot-password.html\" ) } );\n        $routeProvider.when( \"/404\", { templateUrl: partialPath( \"404.html\" ) } );\n\n        $routeProvider.when( \"/verify-email/:token\", {\n            templateUrl: partialPath( \"verify-email.html\" ),\n            resolve: { appRedirect: function ( AppRedirect, $route )\n                {\n                    return AppRedirect.redirect( \"verify-email/\" + $route.current.params.token );\n                } } } );\n\n        $routeProvider.when( \"/verify-phone/:token\", { templateUrl: partialPath( \"verify-phone.html\" ),\n            resolve: { appRedirect: function ( AppRedirect, $route )\n                {\n                    return AppRedirect.redirect( \"verify-phone/\" + $route.current.params.token );\n                } } } );\n\n        $routeProvider.when( \"/verify-phone\", { templateUrl: partialPath( \"verify-phone.html\" ),\n            resolve: { appRedirect: function ( AppRedirect, $route )\n                {\n                    return AppRedirect.redirect( \"verify-phone\" );\n                } } } );\n\n        $routeProvider.when( \"/reset-password/:token\", { templateUrl: partialPath( \"reset-password.html\" ),\n            resolve: { appRedirect: function ( AppRedirect, $route )\n                {\n                    return AppRedirect.redirect( \"reset-password/\" + $route.current.params.token );\n                } } } );\n\n        $routeProvider.when( \"/my/account\", { templateUrl: partialPath( \"account.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/my/account/password\", { templateUrl: partialPath( \"change-password.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/my/trunq\", { templateUrl: partialPath( \"trunq/home.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/my/add\", { templateUrl: partialPath( \"trunq/add.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/my/shared\", { templateUrl: partialPath( \"trunq/shared.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/my/notifications\", { templateUrl: partialPath( \"trunq/notifications.html\" ),\n            resolve: { auth: requireAuth } } );\n\n        $routeProvider.when( \"/p/:itemId\", { templateUrl: partialPath( \"trunq/item-details.html\" ) } );\n\n        $routeProvider.when( \"/s/:itemId\", { templateUrl: partialPath( \"trunq/share-details.html\" ) } );\n\n        $routeProvider.otherwise( { redirectTo: \"/\" } );\n\n        $locationProvider.html5Mode( true ).hashPrefix( \"!\" );\n\n        $sceDelegateProvider.resourceUrlWhitelist(\n            [ \"self\", \"https://staging.trunq.com/**\", \"https://api.trunq.com/**\" ]\n        );\n\n        APIProvider.setRootPath( APIRoot );\n        APIProvider.unauthorizedInterrupt = false;\n        RouteAuthProvider.setRedirectPath( LoginPath );\n        AppRedirectProvider.setProtocol( \"trunqapp\" );\n\n        toastr.options = {\n            positionClass: \"toast-top-right\",\n            preventDuplicates: true,\n            newestOnTop: true\n        };\n\n        var everyToast = function ( call )\n        {\n            toastr.options.preventDuplicates = false;\n            call();\n            toastr.options.preventDuplicates = true;\n        };\n\n        toastr.everySuccess = function ( message )\n        {\n            everyToast( toastr.success.bind( this, message ) );\n        };\n\n        toastr.everyWarning = function ( message )\n        {\n            everyToast( toastr.warning.bind( this, message ) );\n        };\n\n        toastr.everyInfo = function ( message )\n        {\n            everyToast( toastr.info.bind( this, message ) );\n        };\n    }\n\n] )\n\n.run( [ \"$rootScope\", \"LoginPath\", \"NotFoundPath\", \"$location\", \"$animate\",\n    function ( $rootScope, LoginPath, NotFoundPath, $location, $animate )\n    {\n        $animate.enabled( false );\n\n        $rootScope.$on( \"APIRequestUnauthorized\", function ()\n        {\n            if( $location.path() !== LoginPath )\n            {\n                $location.path( LoginPath );\n            }\n        } );\n\n        $rootScope.$on( \"APIRequestNotFound\", function ()\n        {\n            if( $location.path() !== NotFoundPath )\n            {\n                $location.path( NotFoundPath );\n            }\n        } );\n    }\n] )\n\n.constant( \"APIHost\",   \"{{ API_HOST }}\" )\n.constant( \"APIRoot\",   \"{{ API_HOST }}\" + \"v1/\" )\n.constant( \"LoginPath\", \"/sign-in\" )\n.constant( \"NotFoundPath\", \"/404\" );\n"
                 } );
        };

        cvr.getCoverage( coverage, "lcov", onCov );

    } );

router.post( "/coverage", function( req, res, next )
{
    if( req.body.token && req.body.commit && req.body.coverage )
    {
        var onCoverageSaved = function ( err )
        {
            if( err )
            {
                return res.status( 404 ).send( err.message ).end();
            }

            return res.status( 201 ).end();
        };

        saveCoverage( req.body.token, req.body.commit, req.body.coverage, onCoverageSaved );
    }

    res.status( 400 ).end();
} );

var saveCoverage = function ( token, hash, coverage, callback )
{
    var onRepo = function ( err, repo )
    {
        if( err )
        {
            return callback( err );
        }

        if( !repo )
        {
            return callback( new Error( "Token is not registered" ) );
        }

        var commit = repo.commits.filter( function ( c )
        {
            return c.hash == hash;
        } );

        if( commit.length )
        {
            commit[ 0 ].coverage = coverage;
        }
        else
        {
            repo.commits.push( {
                hash: hash,
                coverage: coverage
            } );
        }

        repo.save( callback );
    };

    models.Repo.findOne( { token: token }, onRepo );
};



var repos = [
    {
        host: "github",
        owner: "vokal",
        name: "web",
        token: "a",
        commits: [ {
            hash: "1",
            coverage: "TN:\nSF:source/scripts/project/app.js\nFN:5,(anonymous_1)\nFN:10,(anonymous_2)\nFN:15,(anonymous_3)\nFN:20,(anonymous_4)\nFN:53,(anonymous_5)\nFN:58,(anonymous_6)\nFN:63,(anonymous_7)\nFN:78,(anonymous_8)\nFN:84,(anonymous_9)\nFN:90,(anonymous_10)\nFN:96,(anonymous_11)\nFN:142,(anonymous_12)\nFN:149,(anonymous_13)\nFN:154,(anonymous_14)\nFN:159,(anonymous_15)\nFN:168,(anonymous_16)\nFN:172,(anonymous_17)\nFN:180,(anonymous_18)\nFNF:18\nFNH:6\nFNDA:1,(anonymous_1)\nFNDA:1,(anonymous_2)\nFNDA:2,(anonymous_3)\nFNDA:0,(anonymous_4)\nFNDA:7,(anonymous_5)\nFNDA:154,(anonymous_6)\nFNDA:0,(anonymous_7)\nFNDA:0,(anonymous_8)\nFNDA:0,(anonymous_9)\nFNDA:0,(anonymous_10)\nFNDA:0,(anonymous_11)\nFNDA:0,(anonymous_12)\nFNDA:0,(anonymous_13)\nFNDA:0,(anonymous_14)\nFNDA:0,(anonymous_15)\nFNDA:7,(anonymous_16)\nFNDA:0,(anonymous_17)\nFNDA:0,(anonymous_18)\nDA:3,1\nDA:5,1\nDA:7,1\nDA:10,1\nDA:12,1\nDA:15,1\nDA:17,2\nDA:20,1\nDA:22,0\nDA:23,0\nDA:25,0\nDA:27,0\nDA:30,1\nDA:58,7\nDA:60,154\nDA:63,7\nDA:65,7\nDA:66,7\nDA:67,7\nDA:68,7\nDA:69,7\nDA:70,7\nDA:71,7\nDA:72,7\nDA:73,7\nDA:74,7\nDA:76,7\nDA:80,0\nDA:83,7\nDA:86,0\nDA:89,7\nDA:92,0\nDA:95,7\nDA:98,0\nDA:101,7\nDA:104,7\nDA:107,7\nDA:110,7\nDA:113,7\nDA:116,7\nDA:119,7\nDA:121,7\nDA:123,7\nDA:125,7\nDA:127,7\nDA:131,7\nDA:132,7\nDA:133,7\nDA:134,7\nDA:136,7\nDA:142,7\nDA:144,0\nDA:145,0\nDA:146,0\nDA:149,7\nDA:151,0\nDA:154,7\nDA:156,0\nDA:159,7\nDA:161,0\nDA:170,7\nDA:172,7\nDA:174,0\nDA:176,0\nDA:180,7\nDA:182,0\nDA:184,0\nLF:67\nLH:49\nBRDA:12,1,0,1\nBRDA:12,1,1,0\nBRDA:12,1,2,0\nBRDA:23,2,0,0\nBRDA:23,2,1,0\nBRDA:174,3,0,0\nBRDA:174,3,1,0\nBRDA:182,4,0,0\nBRDA:182,4,1,0\nBRF:9\nBRH:1\nend_of_record\nTN:\nSF:source/scripts/project/controllers/_.js\nFN:6,(anonymous_1)\nFN:17,(anonymous_2)\nFN:22,(anonymous_3)\nFN:32,(anonymous_4)\nFN:37,(anonymous_5)\nFN:40,(anonymous_6)\nFNF:6\nFNH:0\nFNDA:0,(anonymous_1)\nFNDA:0,(anonymous_2)\nFNDA:0,(anonymous_3)\nFNDA:0,(anonymous_4)\nFNDA:0,(anonymous_5)\nFNDA:0,(anonymous_6)\nDA:3,1\nDA:10,0\nDA:12,0\nDA:13,0\nDA:14,0\nDA:15,0\nDA:17,0\nDA:19,0\nDA:22,0\nDA:24,0\nDA:26,0\nDA:28,0\nDA:32,0\nDA:34,0\nDA:37,0\nDA:39,0\nDA:42,0\nDA:46,0\nDA:48,0\nLF:19\nLH:1\nBRDA:26,1,0,0\nBRDA:26,1,1,0\nBRDA:34,2,0,0\nBRDA:34,2,1,0\nBRDA:46,3,0,0\nBRDA:46,3,1,0\nBRF:6\nBRH:0\nend_of_record\nTN:\nSF:source/scripts/project/controllers/account.js\nFN:5,(anonymous_1)\nFN:14,(anonymous_2)\nFN:19,(anonymous_3)\nFN:24,(anonymous_4)\nFN:30,(anonymous_5)\nFN:34,(anonymous_6)\nFN:39,(anonymous_7)\nFNF:7\nFNH:0\nFNDA:0,(anonymous_1)\nFNDA:0,(anonymous_2)\nFNDA:0,(anonymous_3)\nFNDA:0,(anonymous_4)\nFNDA:0,(anonymous_5)\nFNDA:0,(anonymous_6)\nFNDA:0,(anonymous_7)\nDA:2,1\nDA:9,0\nDA:11,0\nDA:13,0\nDA:16,0\nDA:17,0\nDA:21,0\nDA:24,0\nDA:26,0\nDA:27,0\nDA:30,0\nDA:32,0\nDA:33,0\nDA:36,0\nDA:37,0\nDA:41,0\nLF:16\nLH:1\nBRF:0\nBRH:0\nend_of_record\nTN:\nSF:source/scripts/project/controllers/change-password.js\nFN:5,(anonymous_1)\nFN:18,(anonymous_2)\nFN:30,(anonymous_3)\nFN:33,(anonymous_4)\nFN:37,(anonymous_5)\nFNF:5\nFNH:0\nFNDA:0,(anonymous_1)\nFNDA:0,(anonymous_2)\nFNDA:0,(anonymous_3)\nFNDA:0,(anonymous_4)\nFNDA:0,(anonymous_5)\nDA:2,1\nDA:9,0\nDA:10,0\nDA:12,0\nDA:18,0\nDA:20,0\nDA:22,0\nDA:24,0\nDA:27,0\nDA:30,0\nDA:32,0\nDA:35,0\nDA:39,0\nLF:13\nLH:1\nBRDA:22,1,0,0\nBRDA:22,1,1,0\nBRDA:22,2,0,0\nBRDA:22,2,1,0\nBRF:4\nBRH:0\nend_of_record\nTN:\nSF:source/scripts/project/controllers/contact.js\nFN:5,(anonymous_1)\nFNF:1\nFNH:0\nFNDA:0,(anonymous_1)\nDA:2,1\nLF:1\nLH:1\nBRF:0\nBRH:0\nend_of_record\nTN:\nSF:source/scripts/project/controllers/faqs.js\nFN:5,(anonymous_1)\nFNF:1\nFNH:0\nFNDA:0,(anonymous_1)\nDA:2,1\nLF:1\nLH:1\nBRF:0\nBRH:0\nend_of_record\nTN:\nSF:source/scripts/project/controllers/forgot-password.js\nFN:5,(anonymous_1)\nFN:16,(anonymous_2)\nFN:22,(anonymous_3)\nFN:25,(anonymous_4)\nFN:29,(anonymous_5)\nFNF:5\nFNH:0\nFNDA:0,(anonymous_1)\nFNDA:0,(anonymous_2)\nFNDA:0,(anonymous_3)\nFNDA:0,(anonymous_4)\nFNDA:0,(anonymous_5)\nDA:2,1\nDA:9,0\nDA:10,0\nDA:12,0\nDA:16,0\nDA:18,0\nDA:19,0\nDA:22,0\nDA:24,0\nDA:27,0\nDA:31,0\nLF:11\nLH:1\nBRF:0\nBRH:0\nend_of_record"
        } ]
    }
];

var users = [
    {
        oauth: {
            authority: "github",
            login: "1234"
        },
        repos: [
            {
                host: "github",
                owner: "vokal",
                name: "web"
            },
            {
                host: "github",
                owner: "vokal",
                name: "systems"
            }
        ]
    }
];


module.exports = router;
