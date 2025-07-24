#!/bin/bash
cd $(dirname "$0")/
baseDir=$(pwd)

if [ ! -f ./fixtures/app.asar ]; then
    cd ./fixtures/asar && npx asar pack app.asar ../app.asar
    echo 'pack app.asar done'
fi