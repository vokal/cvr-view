# cvr-view

Express web front for cvr

## Configuration

The required configuration information is for GitHub OAuth and the MongoDB connection string. This info can be specified in either a `.env` file in the project root, or via environment variables. If required variables are missing a crash will occur.

`GITHUB_ORGS_WHITELIST` is an optional array of allowed GitHub orgs. If empty or omitted, all orgs are allowed.

### environment variables

- GITHUB_CLIENTID
- GITHUB_CLIENTSECRET
- GITHUB_CALLBACKURL
- GITHUB_ORGS_WHITELIST
- DB_CONN
- HOST

## Running with forever

- `npm install`
- `npm install forever -g`
- `forever start bin/www`
