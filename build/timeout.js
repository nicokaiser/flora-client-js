'use strict';

const DEFAULT_TIMEOUT = 15000;

module.exports = ({ timeout }) => {
    if (!timeout) return DEFAULT_TIMEOUT;
    if (Number.isNaN(Number(timeout))) return DEFAULT_TIMEOUT;
    return parseInt(timeout, 10);
};
