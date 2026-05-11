#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm i 24
nvm use 24

npm i


npm run server:dev >7cd-server.log 2>&1 &
npm run client:dev >7cd-client.log 2>&1 &
