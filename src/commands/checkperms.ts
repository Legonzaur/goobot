import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, type GuildMember, PermissionsBitField
} from 'discord.js'
import { getMemberPermissionsRaw } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkperms')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to check the permissions of')
        .setRequired(false))
    .setDescription('Check permission of an user'),
  async execute (interaction: CommandInteraction) {
    if (interaction.guild === null) {
      void interaction.reply({ content: 'I am sorry dave, I\'m afraid I cannot do that\nCommand not available outside of guilds', ephemeral: true })
      return
    }
    let member = interaction.member as GuildMember | null
    if (interaction.options.get('user') !== null) member = interaction.options.getMember('user') as GuildMember | null

    if (member === null) {
      void interaction.reply({ content: 'Can`t find member', ephemeral: true })
      return
    }

    const permissions = await getMemberPermissionsRaw(member)
    const statusUpdate = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('List of roles')
      .setTimestamp()
      .addFields(
        { name: 'User', value: `<@${member.id}>` },
        { name: 'Can add goobs', value: `${permissions.create > 0 ? '🟩' : '🟥'} (${permissions.create})`, inline: true },
        { name: 'Can delete goobs', value: `${permissions.delete > 0 ? '🟩' : '🟥'} (${permissions.delete})`, inline: true },
        { name: 'Can read goobs', value: `${permissions.read > 0 ? '🟩' : '🟥'} (${permissions.read})`, inline: true },
        { name: 'Can edit settings', value: `${(member.permissions?.has(PermissionsBitField.Flags.ManageRoles, true)) ? '🟩' : '🟥'}`, inline: true }
      )

    await interaction.reply({ embeds: [statusUpdate], ephemeral: true })
  }
}
