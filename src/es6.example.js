












/*
class HTTPAdapter {
    request() {

    }
}
*/


// -----------

import HTTPAdapter from 'HTTPAdapter';


class Client extends HTTPAdapter {
    constructor() {
        super();
        this.request();
    }
}



const client = new Client(new HTTPAdapter());