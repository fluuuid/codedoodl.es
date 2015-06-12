// config is coffee....
require('coffee-script/register');

module.exports = function getCredentials() {
    var creds = {};

    try {
        creds = require('../credentials.coffee');
    } catch (e) {
        throw new Error('Wat... No credentials.coffee file... No access')
    }

    return creds;
}
