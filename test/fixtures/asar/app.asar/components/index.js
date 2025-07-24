const dep = require('../dep');
const express = require('express');

module.exports = {
    name() {
        return {
            name: 'index',
            deps: [
                dep.name(),
            ],
            express,
        };
    },
    semver() {
        return require('semver').SEMVER_SPEC_VERSION;
    }
};