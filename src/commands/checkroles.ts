import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, PermissionsBitField
} from 'discord.js'
import { execute, role2obj } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkroles')
    .setDescription('Prints all roles permissions'),
  async execute (interaction: CommandInteraction) {
    if (interaction.guild === null) {
      void interaction.reply({ content: 'I am sorry dave, I cannot do that\nCommand not available outside of guilds', ephemeral: true })
      return
    }

    if ((interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles, true)) !== true) {
      await interaction.reply({ content: 'I am sorry dave, I cannot do that\nYou don\'t have the permission to manage roles on this server', ephemeral: true })
      return
    }

    const permissionList = await execute('SELECT * FROM permissions') as Array<{ guild: string, role: string, permissions: number }>

    const statusUpdate = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('List of roles')
      .setTimestamp()

    permissionList.forEach(e => {
      const permissions = role2obj(e.permissions)

      statusUpdate.addFields(
        { name: 'Role', value: `<@&${e.role.toString()}>` },
        { name: 'Can add goobs', value: permissions.create ? '🟩' : '🟥', inline: true },
        { name: 'Can delete goobs', value: permissions.delete ? '🟩' : '🟥', inline: true }
      )
    })
    await interaction.reply({ embeds: [statusUpdate], ephemeral: true })
  }
}
