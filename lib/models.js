var mongoose = require('mongoose');

var models = {};

module.exports = models;

var repoSchema = mongoose.Schema({
    host: String,
    owner: String,
    name: String,
    token: String,
    commits: [{
        hash: String,
        coverage: String
    }]
});

var userSchema = mongoose.Schema({
    oauth: {
        provider: String,
        username: String
    },
    repos: [{
        owner: String,
        name: String,
        fullName: String
    }]
});

models.Repo = mongoose.model( "repo", repoSchema );
models.User = mongoose.model( "user", userSchema );