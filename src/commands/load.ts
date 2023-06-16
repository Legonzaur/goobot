import {
  type CommandInteraction,
  SlashCommandBuilder,
  type Message,
  ActivityType
} from 'discord.js'
import { owner_id } from '../config.json'
import db, { checkMemberPermissions, execute, insertGoob } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load')
    .setDescription('Synchronise all past and future goobers from this channel'),
  async execute (interaction: CommandInteraction) {
    if (interaction.user.id !== owner_id) {
      await interaction.reply({
        content: 'You do not have access to this command!',
        ephemeral: true
      })
      return
    }
    if (
      interaction.channel?.isDMBased() === true ||
      interaction.guild === undefined
    ) {
      await interaction.reply({
        content: 'This command is disabled for DM channels',
        ephemeral: true
      })
      return
    }

    db.run('DELETE FROM goob WHERE guild = $guild', {
      $guild: interaction.guildId
    })
    db.run('DELETE FROM tracked WHERE guild = $guild', {
      $guild: interaction.guildId
    })

    let loaded = 0
    let loadedImages = 0
    let messages = await interaction.channel?.messages
      .fetch()
      .catch(console.error)
    if (messages === undefined) {
      await interaction.reply("Couldn't fetch messages")
      return
    }
    loaded += messages.size
    await interaction.reply(
      `Loading messages... loaded ${loaded} with ${loadedImages} images`
    )

    while (messages !== undefined && messages.size > 0) {
      const permissionFilter = await Promise.all((messages as unknown as Message[]).map(async e => {
        if (e.member === null) throw new Error('member is null')
        return (await checkMemberPermissions(e.member)).create && e.reactions.resolve('🚫') === null
      }))

      const filteredMessages = (messages as unknown as Message[]).map(e => e).filter((e, i) => permissionFilter[i] && !e.author.bot)

      // parses the messages
      // shenanigans to save goobs into the database
      loadedImages += filteredMessages.map(insertGoob).reduce<number>((acc, v) => v + acc, 0)

      const lastmessage = messages.last() as Message | undefined
      if (lastmessage === undefined) {
        await interaction.editReply("Coudn't fetch message data")
        break
      }
      await interaction.editReply(
        `Loading messages... loaded ${loaded} messages with ${loadedImages} images`
      )

      messages = await interaction.channel?.messages
        .fetch({ before: lastmessage.id })
        .catch(console.error)
      if (messages !== undefined) loaded += messages.size
    }

    await interaction.editReply(
      `Loading complete ! loaded ${loaded} messages with ${loadedImages} images`
    )

    const reply = await interaction.fetchReply()
    if (reply === undefined) {
      await interaction.reply({
        content: 'Impossible to fetch reply. Did something go wrong ?',
        ephemeral: true
      })
      return
    }
    db.run(
      'INSERT INTO tracked (guild, last_message, channel) VALUES ($guild, $last_message, $channel)',
      {
        $guild: interaction.guildId,
        $channel: interaction.channelId,
        $last_message: reply.id
      }
    )
    const length = await execute('SELECT count(*) as count from goob')
    interaction.client.user?.setActivity(`${length[0].count as string} goobers`, {
      type: ActivityType.Listening
    })
  }
}
