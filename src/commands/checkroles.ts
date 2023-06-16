import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, PermissionsBitField
} from 'discord.js'
import { execute, obj2role } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkroles')
    .setDescription('Prints all role permissions'),
  async execute (interaction: CommandInteraction) {
    const role = interaction.options.get('role')?.value
    if (role === undefined) {
      await interaction.reply({ content: 'Cannot find role', ephemeral: true })
      return
    }
    if ((interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles, true)) !== true) {
      await interaction.reply({ content: 'I am sorry dave, I cannot do that\nYou don\'t have the permission to manage roles on this server', ephemeral: true })
      return
    }
    // Set Role

    await execute('DELETE FROM permissions WHERE guild=$guild AND role=$role',
      {
        $guild: interaction.guildId,
        $role: role
      })

    const permissions = {
      create: Boolean(interaction.options.get('create_permission')?.value),
      delete: Boolean(interaction.options.get('delete_permission')?.value)
    }

    await execute('INSERT INTO permissions (guild, role, permissions) VALUES($guild, $role, $permissions)',
      {
        $guild: interaction.guildId,
        $role: role,
        $permissions: obj2role(permissions)
      })

    const statusUpdate = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Role updated successfully')
      .addFields(
        { name: 'Role', value: `<@&${role.toString()}>` },
        { name: 'Can add goobs', value: permissions.create ? '🟩' : '🟥', inline: true },
        { name: 'Can delete goobs', value: permissions.delete ? '🟩' : '🟥', inline: true }
      )
      .setTimestamp()
    await interaction.reply({ embeds: [statusUpdate], ephemeral: true })
  }
}
