#!/bin/bash
cd $(dirname "$0")/
baseDir=$(pwd)

if [ ! -f ./fixtures/app.asar ]; then
    cd $baseDir/fixtures/app && npm install --prefix .
    cd $baseDir/fixtures/asar-source/app && npm install --prefix .

    cd $baseDir/fixtures/asar-source && npx asar pack app ../app.asar
    echo 'pack app.asar done'
fi