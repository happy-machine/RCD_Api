const config = require('./config');
const urls = {
    HOST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/callback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/callback/`,
        REMOTE: '127.0.0.1:${config.SERVER_PORT}/callback/'
    },
    GUEST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/guestcallback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/guestcallback/`,
        REMOTE: '127.0.0.1:${config.SERVER_PORT}/guestcallback/'
    },
    URL_ROOT: {
        DEPLOY: 'https://robots-cant-dance.herokuapp.com',
        LOCAL: 'http://localhost:',
        DEPLOY: '127.0.0.1://robots-cant-dance.herokuapp.com',
    }
};

module.exports = urls;