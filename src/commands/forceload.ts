import {
  type CommandInteraction,
  SlashCommandBuilder,
  ActivityType
} from 'discord.js'
import { execute, insertGoob } from '../db'
import { owner_id } from '../config.json'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forceload')
    .setDescription('Add a message in and its attachements to the database')
    .addStringOption((option) =>
      option
        .setName('messageid')
        .setDescription('The id of the message in the current channel to add the goobs from')
        .setRequired(true)
    ),
  async execute (interaction: CommandInteraction) {
    if (interaction.guild === null) {
      void interaction.reply({ content: 'I am sorry dave, I cannot do that\nCommand not available outside of guilds', ephemeral: true })
      return
    }
    const member = interaction.member
    if (member === null) {
      void interaction.reply({ content: 'Something went wrong : cannot find member', ephemeral: true })
      return
    }

    if (interaction.user.id !== owner_id) {
      await interaction.reply({
        content: 'You do not have access to this command!',
        ephemeral: true
      })
      return
    }

    // if (!(await checkMemberPermissions(member as GuildMember)).delete) {
    //   await interaction.reply({ content: "I am sorry dave, I cannot do that\nYou don't have the permission to manage roles on this server. You muse have the **delete** permission", ephemeral: true })
    //   return
    // }
    const messageId = interaction.options.get('messageid')?.value
    if (messageId === undefined) {
      void interaction.reply({ content: 'Something went wrong : messageid null', ephemeral: true })
      return
    }
    const message = await interaction.channel?.messages.fetch(messageId.toString())
    if (message === undefined) {
      return
    }
    insertGoob(message)
    await interaction.reply({ content: 'Goober inserted', ephemeral: true })
    const length = await execute('SELECT count(*) as count from goob')
    interaction.client.user?.setActivity(`${length[0].count as string} goobers`, {
      type: ActivityType.Listening
    })
  }
}
