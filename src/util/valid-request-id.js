'use strict';

module.exports = (id) => {
    const type = typeof id;

    if (type === 'number') {
        if (Number.isNaN(id)) return false;
        if (!Number.isFinite(id)) return false;
    }

    return type === 'string' || type === 'number';
};
