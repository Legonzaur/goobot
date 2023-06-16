import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, type GuildMember
} from 'discord.js'
import { execute, role2obj } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkperms')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to check the roles of')
        .setRequired(true))
    .setDescription('Check permission of an user for goobot'),
  async execute (interaction: CommandInteraction) {
    if (interaction.guild === null) {
      void interaction.reply({ content: 'I am sorry dave, I cannot do that\nCommand not available outside of guilds', ephemeral: true })
      return
    }
    let member = interaction.member as GuildMember | null
    if (interaction.options.get('user') !== undefined) member = interaction.options.getMember('user') as GuildMember | null

    if (member === null) {
      void interaction.reply({ content: 'Can`t find member', ephemeral: true })
      return
    }

    const allPermissions = await execute('SELECT * FROM permissions WHERE guild=$guild', { $guild: interaction.guildId }) as Array<{ guild: string, role: string, permissions: number }>
    console.log(allPermissions)
    const userPermsBitField = allPermissions.reduce((acc, val) =>
      member?.roles.cache.some(r => r.id === val.role.toString()) === true ? acc | val.permissions : acc
    , 0)

    const permissions = role2obj(userPermsBitField)
    const statusUpdate = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('List of roles')
      .setTimestamp()
      .addFields(
        { name: 'User', value: `<@${member.id}>` },
        { name: 'Can add goobs', value: permissions.create ? '🟩' : '🟥', inline: true },
        { name: 'Can delete goobs', value: permissions.delete ? '🟩' : '🟥', inline: true }
      )

    await interaction.reply({ embeds: [statusUpdate], ephemeral: true })
  }
}
