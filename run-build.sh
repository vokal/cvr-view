#!/bin/bash

npm run testcover

RESULT=$?

if [ $RESULT == 0 ]; then
  GITHASH="$(git rev-parse HEAD)"
  curl -F coverage=@coverage/lcov.info "https://cvr.vokal.io/coverage?token=$CVR_TOKEN&commit=$GITHASH&removepath=/var/cache/drone/src/github.com/vokal/cvr-view/&coveragetype=lcov"
fi

exit $RESULT
