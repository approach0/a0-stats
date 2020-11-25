const Knex = require('knex')
const express = require('express')
const bodyParser = require('body-parser')

const max_items = 120

/* create httpd instance */
app = express()
app.use(bodyParser.json())

/* disable etag (hash) and cache-control policy */
app.disable('etag')
app.use((req, res, next) => {
	res.set('Cache-Control', 'no-cache')
	next()
})

/* connect to database */
const host = '127.0.0.1'
console.log(`To connect database at ${host}`)
const knex = Knex({
  client: 'pg',
  connection: {
    host: host,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  }
})

/* database utility functions */
async function createTable(name, schema) {
  try {
    let exists = await knex.schema.hasTable(name)
    if (!exists) {
      console.log(`creating table '${name}' ...`)
      await knex.schema.createTable(name, schema)
    } else {
      console.log(`table '${name}' already exists`)
    }
  } catch (err) {
    console.error(err.toString())
  }
}

async function DB_init() {

  await createTable('query', function(table) {
    table.datetime('time').notNullable()
    table.string('ip').notNullable()
    table.integer('page').notNullable()
    table.integer('id').primary().notNullable()
    table.index('ip')
  })

  await createTable('ip_info', function(table) {
    table.string('region').notNullable()
    table.string('country').notNullable()
    table.string('ip').notNullable()
    table.primary('ip')
  })

  await createTable('keyword', function(table) {
    table.string('str', 511).notNullable()
    table.string('type').notNullable()
    table.string('op')
    table.integer('qryID').notNullable()
    table.index('qryID')
  })
}

async function DB_push_query(query) {
  const ret = await knex('query').insert({
    time: knex.fn.now(),
    ip: query['ip'] || '0.0.0.0',
    page: query['page'] || 0
  })
  .returning('id')

  for (let i = 0; i < query.kw.length; i++) {
    const kw = query.kw[i]
    await knex('keyword').insert({
      str: kw['str'] || '',
      type: kw['type'] || 'word',
      op: null,
      qryID: ret[0]
    })
  }
}

/* initialize everything */
;(async function() {
  console.log('Ensure DB table exists ...')
  await DB_init()

  const port = 3207
  console.log('listening on ' + port)
  app.listen(port)

  process.on('SIGINT', function() {
    console.log('')
    console.log('closing...')
    process.exit()
  })

})()

/* httpd routers */
app.get('/', function (req, res) {
	res.send('This is statsd!')

}).post('/push/query', async (req, res) => {
	const query = req.body

  DB_push_query(query)
  res.json({'res': 'succussful'})

}).get('/pull/query-items/:max/:from.:to', (req, res) => {
	const max = Math.min(max_items, req.params.max)
	const arr = qrylog.pull_query_items(db, max, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

}).get('/pull/query-items/from-:ip/:max/:from.:to', (req, res) => {
	const max = Math.min(max_items, req.params.max)
	const arr = qrylog.pull_query_items_of(db, req.params.ip, max, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

}).get('/pull/query-IPs/:max/:from.:to', (req, res) => {
	const max = Math.min(max_items, req.params.max)
	const arr = qrylog.pull_query_IPs(db, max, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

}).get('/pull/query-IPs/from-:ip/:max/:from.:to', (req, res) => {
	const max = Math.min(max_items, req.params.max)
	const arr = qrylog.pull_query_IPs_of(db, req.params.ip, max, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

}).get('/pull/query-summary/:from.:to', (req, res) => {
	const arr = qrylog.pull_query_summary(db, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

}).get('/pull/query-trend/:from.:to', (req, res) => {
	const arr = qrylog.pull_query_trend(db, {
		begin: req.params.from,
		end: req.params.to
	})
	res.json({'res': arr})

})
