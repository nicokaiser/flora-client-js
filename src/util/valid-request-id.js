'use strict';

module.exports = (id) => {
    const type = typeof id;

    if (type === 'number') {
        if (isNaN(id)) return false;
        if (!isFinite(id)) return false;
    }

    return type === 'string' || type === 'number';
};
