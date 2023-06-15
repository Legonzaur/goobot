import { verbose } from 'sqlite3'
const sqlite = verbose()
const db = new sqlite.Database('goobers')

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS goob (url TEXT UNIQUE)')
})

export default db
