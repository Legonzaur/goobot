import {
  type CommandInteraction,
  SlashCommandBuilder,
  PermissionsBitField
} from 'discord.js'
import { execute } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delrole')
    .setDescription('Delete a role from the database')
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription('The role to delete')
        .setRequired(true)
    ),
  async execute (interaction: CommandInteraction) {
    if (interaction.guild === null) {
      void interaction.reply({ content: 'I am sorry dave, I cannot do that\nCommand not available outside of guilds', ephemeral: true })
      return
    }

    if (
      interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles, true) !== true) {
      await interaction.reply({ content: "I am sorry dave, I cannot do that\nYou don't have the permission to manage roles on this server", ephemeral: true })
      return
    }

    await execute('DELETE FROM permissions WHERE role=$role AND guild=$guild', { $role: interaction.options.get('role')?.value, $guild: interaction.guildId })

    await interaction.client.commands.get('checkroles')?.execute(interaction)
  }
}
