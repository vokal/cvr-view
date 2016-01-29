# CVR View

**The easy open source way to privately host your code coverage.**

[![line cvr](https://cvr.vokal.io/vokal/cvr-view/shield.svg)](https://cvr.vokal.io/repo/vokal/cvr-view)


CVR View is an Express application for hosting your code coverage results. If you'd like to host your coverage internally, or without paying for monthly services, CVR View might be for you.

To get started, using the [seed project](https://github.com/vokal/cvr-view-seed) is recommended to make your future updating as simple as a new `npm install`.

#### MIT Licensed


## Configuration

Configuration requires some setup and copying of related details into environment variables on the machine hosting Node.js:

- Create a GitHub Application
- Host a MongoDB Instance
- Host CVR on Node.js
- Expose a domain name to the hosted instance


### Required Environment Variables

The required configuration information is for GitHub OAuth and the MongoDB connection string. This info can be specified in either a `.env` file in the project root, or via environment variables. A `.env-sample` file is included that you can fill out and rename as `.env`.

If required variables are missing a crash will occur.

- `GITHUB_CLIENTID` GitHub OAuth Client ID
- `GITHUB_CLIENTSECRET` GitHub OAuth Client Secret
- `GITHUB_CALLBACKURL` GitHub OAuth Callback URL
- `DB_CONN` MongoDB Connection String
- `HOST` The host the server will run on

### Optional Environment Variables

- `GITHUB_ORGS_WHITELIST` Optional array of allowed GitHub orgs. If empty or omitted, all orgs are allowed.
- `MAX_REPO_COMMIT_HISTORY` By default only the last 20 commits per repo are saved to conserve storage space.


#### Create a GitHub Application

A GitHub application must be created through GitHub.com to give access to repos in your organization. It is not recommended to make the application on this page https://github.com/settings/applications/new but if you select the relevant organization from the bottom left of the page and then select Applications on the left, you can make the application under the organization's account.

- Application name can be anything you recognize, `cvr` will do.
- Homepage URL should be the address where you are hosting your CVR server, maybe something like `https://cvr.domain.com`.
- Authorization Callback URL should be the domain above with the added path `/auth/github/callback`, so with our example that would be `https://cvr.domain.io/auth/github/callback`. This is the same URL to use for the environment variable `GITHUB_CALLBACKURL`
- Save the settings and grab the Client ID and Client Secret from the top right of the page for use with the corresponding environment variables.


#### Host a MongoDB Instance

If you are not familiar with hosting MongoDB, using a service like MongoLab is recommended. Once you create an instance and user, grab the connection string, which is a URL, and assign it to the `DB_CONN` environment variable. This URL starts with `mongodb://`.


#### Host CVR on Node.js

Running the service with something like Forever that provides automatic restarts is recommended. For example:

- `npm install`
- `npm install forever -g`
- `forever start bin/www`


#### Expose a Domain Name to the Hosted Instance

The application will need to be hosted under a domain that matches the one you entered when creating the GitHub application. This needs to be configured at the DNS level, generally as a CNAME.
