'use strict';

/**
 * @param {Object} obj
 * @return {string}
 */
module.exports = obj => {
    return Object.keys(obj)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
        .join('&');
};
