import {
  type CommandInteraction,
  SlashCommandBuilder, PermissionsBitField
} from 'discord.js'
import { execute } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Adds permissions to a discord role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('delete_permission')
        .setDescription('Permission to delete goobs')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('create_permission')
        .setDescription('Permission to add goobs')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('read_permission')
        .setDescription('Permission to run the goob command')
        .setRequired(true)),
  async execute (interaction: CommandInteraction) {
    /* const totalweight = (await execute('SELECT SUM(weight) as totalweight from goob'))[0].totalweight
    const number = Math.floor(Math.random() * totalweight) */

    const role = interaction.options.get('role')?.value
    if (role === undefined) {
      void interaction.reply({ content: 'Cannot find role', ephemeral: true })
      return
    }
    if ((interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles, true)) !== true) {
      void interaction.reply({ content: 'I am sorry dave, I cannot do that\nYou don\'t have the permission to manage roles on this server', ephemeral: true })
      return
    }
    // Set Role

    await execute('DELETE FROM permissions WHERE guild=$guild AND role=$role',
      {
        $guild: interaction.guildId,
        $role: role
      })

    const permissions = {
      create: interaction.options.get('create_permission')?.value as number,
      delete: interaction.options.get('delete_permission')?.value as number,
      read: interaction.options.get('read_permission')?.value as number
    }

    await execute('INSERT INTO permissions (guild, role, \'create\', \'read\', \'delete\') VALUES($guild, $role, $create, $read, $delete)',
      {
        $guild: interaction.guildId,
        $role: role,
        $create: permissions.create,
        $read: permissions.read,
        $delete: permissions.delete
      })

    await interaction.client.commands.get('checkroles')?.execute(interaction)
  }
}
