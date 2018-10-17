Flora JS client
================

[![Build Status](https://travis-ci.org/godmodelabs/flora-client-js.svg?branch=master)](https://travis-ci.org/godmodelabs/flora-client-js)

Easily access [Flora](https://github.com/godmodelabs/flora) based APIs.

```js
const FloraClient = require('flora-client-js');
const client = new FloraClient({ url: 'http://api.example.com/' });

client.execute({
    resource: 'article',
    select: 'id,title,date',
    limit: 15
}).then(response => console.log(response));
```

License
-------

[MIT](LICENSE)
