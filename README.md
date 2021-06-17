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

### Note
During the `npm install` of `knex`, it requires python2 and other old environment stuffs,
in this case you may need to develop locally from Docker container:
```
docker run -it --network host --mount type=bind,src=`pwd`,dst=/code a0-stats bash
```
meanwhile, ensure a Postgres server is running:
```
docker run -it --mount type=volume,src=usersdb_vol,dst=/postgres/data -p 8080:80 -p 5432:5432 approach0/postgres13
```
