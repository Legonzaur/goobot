import { type Message, type Client, type GuildMember, ActivityType } from 'discord.js'
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

export function insertGoob (message: Message): number {
  const attachments = message.attachments.filter(
    (e) =>
      e.contentType !== null &&
      (e.contentType?.startsWith('image') || e.contentType?.startsWith('video'))
  )

  const embeds = message.embeds.filter((e) => e.image !== undefined || e.video !== undefined)

  let promises = attachments.map(async a =>
    await execute('INSERT INTO goob (messageid, guild, channel, url) VALUES ($messageid, $guild, $channel, $url)', {
      $messageid: message.id,
      $guild: message.guildId,
      $channel: message.channelId,
      $url: a.url
    })
  )

  promises = [...promises, ...embeds.map(async e =>
    await execute('INSERT INTO goob (messageid, guild, channel, url) VALUES ($messageid, $guild, $channel, $url)', {
      $messageid: message.id,
      $guild: message.guildId,
      $channel: message.channelId,
      $url: e.video !== undefined ? e.video?.url : e.image?.url
    })
  )]

  if (attachments.size > 0 || embeds.length > 0) void message.react('📥')
  void Promise.all(promises).catch(async () => await message.react('⁉️'))
  return attachments.size + embeds.length
}

export async function deleteGoob (targetimage: { guild: string, channel: string, messageid: string, url: string, id: number }, client: Client): Promise<void> {
  await execute('DELETE FROM goob WHERE id=$id', { $id: targetimage.id })
  const messageGuild = await client.guilds.fetch(targetimage.guild)
  const messageChannel = await messageGuild.channels.fetch(targetimage.channel)
  let message = undefined as Message | undefined

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (messageChannel?.isTextBased()) {
    message = await messageChannel.messages.fetch(targetimage.messageid).catch(() => undefined)
  }
  if (message === undefined) return
  await message.react('🚫')
}

export async function loadPreviousGoob (client: Client): Promise<void> {
  const channels = await execute('SELECT * from tracked') as Array<{ guild: string, channel: string, last_message: string }>

  await Promise.all(channels.map(async c => {
    const guild = await client.guilds.fetch(c.guild)
    const channel = await guild.channels.fetch(c.channel)
    if (channel === null) return
    if (!channel.isTextBased()) return

    let messages = await channel?.messages
      .fetch({ after: c.last_message })
      .catch(console.error)
    let loaded = 0
    let loadedImages = 0
    let lastmessage
    while (messages !== undefined && messages.size > 0) {
      loaded += messages.size
      const permissionFilter = await Promise.all((messages as unknown as Message[]).map(async e => {
        let member = e.member
        if (member === null) {
          const member2 = await (e.guild?.members.fetch(e.author.id))?.catch(e => {})
          if (member2 === undefined) return
          member = member2
        }
        return (await checkMemberPermissions(member)).create && e.reactions.resolve('🚫') === null
      }))

      const filteredMessages = (messages as unknown as Message[]).map(e => e).filter((e, i) => (permissionFilter[i] ?? false) && !e.author.bot)

      // parses the messages
      // shenanigans to save goobs into the database
      loadedImages += filteredMessages.map(insertGoob).reduce<number>((acc, v) => v + acc, 0)

      lastmessage = messages.first() as Message | undefined
      if (lastmessage === undefined) {
        console.error("Coudn't fetch message data")
        break
      }
      client.user?.setActivity(`${loaded} messages with ${loadedImages} images`, {
        type: ActivityType.Watching
      })

      messages = await channel?.messages
        .fetch({ after: lastmessage.id })
        .catch(console.error)
    }
    if (lastmessage === undefined) return
    await execute('UPDATE tracked SET last_message=$last_message WHERE guild=$guild AND channel=$channel',
      { $channel: channel.id, $guild: channel.guildId, $last_message: lastmessage.id })
  }))
}

export default db
