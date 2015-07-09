# cvr-view

Express web front for cvr

## Configuration

The required configuration information is for GitHub OAuth and the MongoDB connection string. This info can be specified in either a `local-settings.json` in the project root, or via environment variables. Environment variables will take precedence over using a `local-settings.json`. If neither is specified, currently a crash will occur.

`gitHub.orgsWhitelist` is an optional array of allowed GitHub orgs. If empty or omitted, all orgs are allowed.

### local-settings.json
```js
{
    "gitHub": {
        "clientId": "...",
        "clientSecret": "...",
        "callbackUrl": "http://:HOST/auth/github/callback",
        "orgsWhitelist": [ ... ]
    },
    "dbConn": "mongodb://...",
    "host": "https://cvr.vokal.io/",
    "webhookUrl": "https://cvr.vokal.io/webhook"
}
```

### environment variables

- GITHUB_CLIENTID
- GITHUB_CLIENTSECRET
- GITHUB_CALLBACKURL
- GITHUB_ORGS_WHITELIST
- DB_CONN

## Running with forever

- `npm install`
- `npm install forever -g`
- `forever start bin/www`

