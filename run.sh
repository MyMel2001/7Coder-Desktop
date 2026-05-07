#!/bin/bash
npm i


npm run server:dev >7cd-server.log 2>&1 &
npm run client:dev >7cd-client.log 2>&1 &
