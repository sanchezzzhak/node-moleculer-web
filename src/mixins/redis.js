const Redis = require('ioredis');

const defaultOptions = {
    host: 'localhost',
    port: '6379',
    password: '',
    lazyConnect: true,
};

module.exports = ({ key = 'redis', options = defaultOptions } = {}) => ({
    settings: {
        [key]: options,
    },
    created() {
        this[key] = new Redis(this.settings[key]);
    },
    async started() {
        await this[key].connect();
    },
    stopped() {
        this[key].disconnect();
    },


});