import {
  type CommandInteraction,
  SlashCommandBuilder
} from 'discord.js'

module.exports = {
  global: true,
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Invite this bot into your server'),
  async execute (interaction: CommandInteraction) {
    await interaction.reply({ content: 'https://discord.com/api/oauth2/authorize?client_id=1118990136236068965&permissions=2048&scope=bot%20applications.commands' })
  }
}
