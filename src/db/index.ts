import { Guild, type GuildMember } from 'discord.js'
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
  db.run('CREATE TABLE IF NOT EXISTS permissions (guild TEXT NOT NULL, role TEXT NOT NULL, \'create\' INTEGER DEFAULT 0, \'delete\' INTEGER DEFAULT 0, \'read\' INTEGER DEFAULT 1, PRIMARY KEY (guild, role))')
})

export interface PermsNumbers { create: number, read: number, delete: number }
export interface Perms { create: boolean, delete: boolean, read: boolean }

export async function getMemberPermissionsRaw (member: GuildMember): Promise<PermsNumbers> {
  const allPermissions = await execute('SELECT * FROM permissions WHERE guild=$guild', { $guild: member.guild.id }) as Array<PermsNumbers & { role: string }>
  const userPerms = allPermissions.reduce<PermsNumbers>((acc, val) => {
    if (!member?.roles.cache.some(r => r.id === val.role.toString())) return acc
    return {
      create: acc.create + val.create,
      read: acc.read + val.read,
      delete: acc.delete + val.delete
    }
  }, { create: 0, read: 0, delete: 0 })
  return userPerms
}

export async function checkMemberPermissions (member: GuildMember): Promise<Perms> {
  const userPerms = await getMemberPermissionsRaw(member)
  return {
    create: userPerms.create > 0,
    read: userPerms.read > 0,
    delete: userPerms.read > 0
  }
}
export default db
