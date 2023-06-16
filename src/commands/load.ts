import {
  type CommandInteraction,
  SlashCommandBuilder,
  type Message
} from 'discord.js'
import { owner_id } from '../config.json'
import db from '../db'

function insertGoob (message: Message): void {
  const attachments = message.attachments.filter(
    (e) =>
      e.contentType !== null &&
      (e.contentType?.startsWith('image') || e.contentType?.startsWith('video'))
  )

  const embeds = message.embeds.filter((e) => e.image !== undefined || e.video !== undefined)

  attachments.forEach(a => db.run('INSERT INTO goob (messageid, guild, channel, url) VALUES ($messageid, $guild, $channel, $url)', {
    $messageid: message.id,
    $guild: message.guildId,
    $channel: message.channelId,
    $url: a.url
  }))

  embeds.forEach(e => db.run('INSERT INTO goob (messageid, guild, channel, url) VALUES ($messageid, $guild, $channel, $url)', {
    $messageid: message.id,
    $guild: message.guildId,
    $channel: message.channelId,
    $url: e.video !== undefined ? e.video?.url : e.image?.url
  }))

  if (attachments.size > 0 || embeds.length > 0) void message.react('📥')
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load')
    .setDescription('Sync data for '),
  async execute (interaction: CommandInteraction) {
    if (interaction.user.id !== owner_id) {
      await interaction.reply({
        content: 'You do not have access to this command!',
        ephemeral: true
      })
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
    const loadedImages = 0
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
      (messages as unknown as Message[])
        .map((e) => e).filter(e => !e.author.bot)
        .filter(
          (e) =>
            e.attachments.filter(
              (e) =>
                e.contentType !== null &&
                (e.contentType?.startsWith('image') ||
                  e.contentType?.startsWith('video'))
            ).size > 0
        ).map(insertGoob);

      (messages as unknown as Message[])
        .map((e) => e).filter(e => !e.author.bot)
        .filter(
          (e) =>
            e.embeds.filter(
              (e) => e.image !== undefined
            ).length > 0
        ).map(insertGoob)

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

    // interaction.user is the object representing the User who ran the command
    // interaction.member is the GuildMember object, which represents the user in the specific guild
    // await interaction.reply(`This command was run by ${interaction.user.username}`)
  }
}
