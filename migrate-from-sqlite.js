const sqlite3 = require('better-sqlite3')
const Knex = require('knex')

const db_sqlite = new sqlite3('qrylog.sqlite3', {verbose: console.log})
const db_knex = Knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  }
})

async function migrate_query(limit) {
  await db_knex.schema.dropTableIfExists('query')
  await db_knex.schema.createTable('query', function(table) {
    table.datetime('time').notNullable()
    table.string('ip').notNullable()
    table.integer('page').notNullable()
    table.integer('id').primary().notNullable()
    table.index('ip')
  })

  const limit_clause = (limit < 0) ? '' : ` limit ${limit || 10}`
  const stmt = db_sqlite.prepare('SELECT * from query ' +  limit_clause)

  for (const row of stmt.iterate()) {
    console.log(row)
    await db_knex('query').insert({
      time: row.time,
      ip: row.ip || '0.0.0.0',
      page: row.page,
      id: row.id
    })
  }
}

async function migrate_ip_info(limit) {
  await db_knex.schema.dropTableIfExists('ip_info')
  await db_knex.schema.createTable('ip_info', function(table) {
    table.string('region').notNullable()
    table.string('country').notNullable()
    table.string('ip').notNullable()
    table.primary('ip')
  })

  const limit_clause = (limit < 0) ? '' : ` limit ${limit || 10}`
  const stmt = db_sqlite.prepare('SELECT * from ip_info ' +  limit_clause)

  for (const row of stmt.iterate()) {
    console.log(row)
    await db_knex('ip_info').insert({
      region: row.city + ', ' + row.region,
      country: row.country,
      ip: row.ip || '0.0.0.0'
    })
  }
}

async function migrate_keyword(limit) {
  await db_knex.schema.dropTableIfExists('keyword')
  await db_knex.schema.createTable('keyword', function(table) {
    table.string('str').notNullable()
    table.string('type').notNullable()
    table.string('op')
    table.integer('qryID').notNullable()
    table.index('qryID')
  })

  const limit_clause = (limit < 0) ? '' : ` limit ${limit || 10}`
  let statm = db_sqlite.prepare('SELECT * from keyword ' +  limit_clause)

  for (const row of statm.iterate()) {
    console.log(row)
    await db_knex('keyword').insert({
      str: row.str,
      type: row.type,
      op: null,
      qryID: row.qryID
    })
  }
}

;(async function() {
  await migrate_ip_info(-1)
  await migrate_query(-1)
  await migrate_keyword(-1)

  db_sqlite.close()
  process.exit()
})()
