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

for (const row in db_sqlite.prepare('SELECT * from query limit 10').iterate()) {
  console.log(row)
}

db_sqlite.close()
process.exit()
