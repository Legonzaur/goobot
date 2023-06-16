import {
  type CommandInteraction,
  SlashCommandBuilder,
  ActivityType
} from 'discord.js'
import { owner_id } from '../config.json'
import db, { execute } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
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

    await interaction.client.commands.get('load')?.execute(interaction)

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
