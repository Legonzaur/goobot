import { verbose } from 'sqlite3'
const sqlite = verbose()
const db = new sqlite.Database('goobers.db')

export async function execute (query: string, args = {} as any): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    db.all(query, args, (err: string, rows: any) => {
      if (err !== null) {
        reject(err)
        console.error(err)
        return
      }
      resolve(rows)
    })
  })
}

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS goob (id INTEGER PRIMARY KEY AUTOINCREMENT, messageid TEXT, guild TEXT, channel TEXT, url TEXT NOT NULL UNIQUE)')
  db.run('CREATE TABLE IF NOT EXISTS tracked (guild TEXT UNIQUE, last_message TEXT, channel TEXT)')
  db.run('CREATE TABLE IF NOT EXISTS permissions (guild TEXT NOT NULL, role TEXT NOT NULL, permissions INTEGER, PRIMARY KEY (guild, role))')
})

export function role2obj (role: number): { create: boolean, delete: boolean } {
  return {
    create: Boolean(role & 1),
    delete: Boolean(role & 2)
  }
}

export function obj2role (role: ReturnType<typeof role2obj>): number {
  return Number(role.create) | (Number(role.delete) * 2)
}

export default db
