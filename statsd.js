const Knex = require('knex')
const Xor = require('base64-xor')
const express = require('express')
const bodyParser = require('body-parser')

const IP_XOR_SECRET = process.env['IP_XOR_SECRET'] || 'iamforgetful'
const PG_HOST = process.env['PG_HOST'] || '127.0.0.1'

const max_items = 120

/* create httpd instance */
app = express()
app.use(bodyParser.json())

/* connect to database */
console.log(`To connect database at ${PG_HOST}`)
const knex = Knex({
  client: 'pg',
  connection: {
    host: PG_HOST,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  },
  pool: {
    min: 0,
    max: 10
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

async function DB_init_tables() {

  await createTable('query', function(table) {
    table.datetime('time').notNullable()
    table.string('ip').notNullable()
    table.integer('page').notNullable()
    table.increments('id').primary()
  })

  await createTable('ip_info', function(table) {
    table.string('city').notNullable()
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

async function DB_insert_query(query) {
  const ret = await knex('query').insert({
    time: knex.fn.now(),
    page: query['page'] || 0,
    ip: query['ip'] || '0.0.0.0'
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

async function DB_update_ip_info(query) {
  const geo = query['geo'] || {}
  const city = geo['city'] || 'Unknown'
  const region = geo['region'] || 'Unknown'
  const country = geo['country'] || 'Unknown'
  const insert_stmt = knex('ip_info').insert({
    city: city,
    region: region,
    country: country,
    ip: query['ip'] || '0.0.0.0'
  }).toString()

  await knex.raw(`${insert_stmt} ON CONFLICT (ip) DO UPDATE SET city=?, region=?, country=?;`,
    [city, region, country]
  )
}

/* simple IP mask and encryption */
function mask_ip(ip) {
  if (ip.trim() === '') return '?'
  const masked = ip.split('.').slice(0,2).join('.')
  return masked + '.*.*'
}

function encrypt_ip(ip) {
  return Xor.encode(IP_XOR_SECRET, ip)
}

function decrypt_ip(ip) {
  return Xor.decode(IP_XOR_SECRET, ip)
}

function row_mapper(row) {
  row.ip = {
    'encrypted': encrypt_ip(row.ip),
    'masked': mask_ip(row.ip)
  }
  return row
}

/* initialize everything */
;(async function() {
  console.log('Ensure DB table exists ...')
  await DB_init_tables()

  app.use('/', express.static('./dist'))

  /* disable etag (hash) and cache-control policy */
  app.disable('etag')
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache')
    next()
  })

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
app.post('/push/query', async (req, res) => {
  try {
    const query = req.body
    console.log(query)

    DB_insert_query(query)
    DB_update_ip_info(query)
    res.json({'res': 'succussful'})

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-items/:max/:from.:to', async (req, res) => {
  try {
    const max = Math.min(max_items, req.params.max)
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT query.id as id, query.time as time, query.ip as ip, query.page as page,
        max(ip_info.city) as city, max(ip_info.region) as region, max(ip_info.country) as country,
        json_agg(json_build_object('str', keyword.str, 'type', keyword.type)) as kw
        FROM query
      JOIN keyword ON query.id = keyword."qryID"
      JOIN ip_info ON query.ip = ip_info.ip
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval)
      GROUP BY id ORDER BY id DESC LIMIT ?`,
      [from, to, max]
    )

    res.json({ 'res': ret.rows.map(row_mapper) })

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-items/from-:ip/:max/:from.:to', async (req, res) => {
  try {
    const max = Math.min(max_items, req.params.max)
    const ip = decrypt_ip(req.params.ip)
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT query.id as id, query.time as time, query.ip as ip, query.page as page,
        max(ip_info.city) as city, max(ip_info.region) as region, max(ip_info.country) as country,
        json_agg(json_build_object('str', keyword.str, 'type', keyword.type)) as kw
        FROM query
      JOIN keyword ON query.id = keyword."qryID"
      JOIN ip_info ON query.ip = ip_info.ip
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval) AND query.ip = ?
      GROUP BY id ORDER BY id DESC LIMIT ?`,
      [from, to, ip, max]
    )

    res.json({ 'res': ret.rows.map(row_mapper) })

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-IPs/:max/:from.:to', async (req, res) => {
  try {
    const max = Math.min(max_items, req.params.max)
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT max(time) as time, query.ip as ip, COUNT(*) as counter,
        max(ip_info.city) as city, max(ip_info.region) as region, max(ip_info.country) as country
        FROM query
      JOIN ip_info ON query.ip = ip_info.ip
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval)
      GROUP BY query.ip ORDER BY counter DESC LIMIT ?`,
      [from, to, max]
    )

    res.json({ 'res': ret.rows.map(row_mapper) })

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-IPs/from-:ip/:max/:from.:to', async (req, res) => {
  try {
    const max = Math.min(max_items, req.params.max)
    const ip = decrypt_ip(req.params.ip)
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT max(time) as time, query.ip as ip, COUNT(*) as counter,
        max(ip_info.city) as city, max(ip_info.region) as region, max(ip_info.country) as country
        FROM query
      JOIN ip_info ON query.ip = ip_info.ip
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval) AND query.ip = ?
      GROUP BY query.ip ORDER BY counter DESC LIMIT ?`,
      [from, to, ip, max]
    )

    res.json({ 'res': ret.rows.map(row_mapper) })

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-summary/:from.:to', async (req, res) => {
  try {
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT COUNT(*) as n_queries, COUNT(DISTINCT IP) as n_uniq_ip FROM query
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval)`,
      [from, to]
    )

    res.json({'res': ret.rows})

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

}).get('/pull/query-trend/:from.:to', async (req, res) => {
  try {
    const from = req.params.from
    const to = req.params.to
    const ret = await knex.schema.raw(
      `SELECT COUNT(DISTINCT ip) as n_uniq_ip, date(time) as date FROM query
      WHERE time >= ?::date AND time < (?::date + '1 day'::interval)
      GROUP BY date(time) LIMIT ?`,
      [from, to, 32]
    )

    res.json({'res': ret.rows})

  } catch (err) {
    res.json({'res': [], 'error': err.toString()})
  }

})
