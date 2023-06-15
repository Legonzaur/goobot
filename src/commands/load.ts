import { type CommandInteraction, SlashCommandBuilder, type Message } from 'discord.js'
import { owner_id } from '../config.json'
import db from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load')
    .setDescription('Provides information about the user.'),
  async execute (interaction: CommandInteraction) {
    if (interaction.user.id !== owner_id) {
      await interaction.reply({ content: 'You do not have access to this command!', ephemeral: true })
    }
    if (interaction.channel?.isDMBased() === true) {
      await interaction.reply({ content: 'This command is disabled for DM channels', ephemeral: true })
      return
    }
    let loaded = 0
    const images = new Set<string>()
    let messages = await interaction.channel?.messages.fetch().catch(console.error)
    if (messages === undefined) {
      await interaction.reply('Couldn\'t fetch messages')
      return
    }
    loaded += messages.size
    await interaction.reply(`Loading messages... loaded ${loaded} with ${images.size} images`)

    while (messages !== undefined && messages.size > 0) {
      const imagesURL = (messages as unknown as Message[]).map(e => e.attachments).filter(e => e.size > 0).map(e => e.map(v => v)).flat().filter(e => e.contentType?.startsWith('image')).map(e => e.url).flat()
      imagesURL.forEach(images.add, images)
      const lastmessage = messages.last() as Message | undefined
      if (lastmessage === undefined) {
        await interaction.editReply('Coudn\'t fetch message data')
        break
      }
      await interaction.editReply(`Loading messages... loaded ${loaded} messages with ${images.size} images`)

      messages = await interaction.channel?.messages.fetch({ before: lastmessage.id }).catch(console.error)
      if (messages !== undefined) loaded += messages.size
    }

    await interaction.editReply(`Loading complete ! loaded ${loaded} messages with ${images.size} images`)
    const stmt = db.prepare('INSERT INTO goob VALUES (?)')

    images.forEach(e => stmt.run(e))
    stmt.finalize()

    db.each('SELECT rowid AS id, url FROM goob', (err, row: any) => {
      console.log(`${row.id as string} : ${row.url as string}`)
      if (err != null) console.error(err)
    })
    console.log(images)
    // interaction.user is the object representing the User who ran the command
    // interaction.member is the GuildMember object, which represents the user in the specific guild
    // await interaction.reply(`This command was run by ${interaction.user.username}`)
  }
}
