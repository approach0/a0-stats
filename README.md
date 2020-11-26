## About

This is the stats page source code of Approach0. It includes backend and fronted, all served by `statsd`.

To setup:
```
$ npm install
$ npm run build

$ export IP_XOR_SECRET=iamforgetful
$ export PG_HOST=localhost
$ node statsd.js
```

It listens on port 3207.
