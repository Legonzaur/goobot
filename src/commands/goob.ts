import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, type Message, ButtonStyle, ButtonBuilder, ActionRowBuilder, ComponentType, type GuildMember
} from 'discord.js'
import { checkMemberPermissions, deleteGoob, execute } from '../db'

module.exports = {
  global: true,
  data: new SlashCommandBuilder()
    .setName('goob')
    .setDescription('meow').addIntegerOption(option =>
      option
        .setName('gooberid')
        .setDescription('The ID of the goob to see')
        .setRequired(false)),
  async execute (interaction: CommandInteraction) {
    // Pick the right goober
    const member = interaction.member ?? undefined
    if (!(await checkMemberPermissions(member as GuildMember)).read) {
      void interaction.reply({ content: 'I am sorry dave, I\'m afraid I cannot do that\nYou do not have access to that command', ephemeral: true })
      return
    }
    await interaction.deferReply()
    const amountOfGoobs = (await execute('SELECT COUNT(*) as totalweight from goob'))[0].totalweight
    let number = Number(interaction.options.get('gooberid')?.value)
    let targetImage: { guild: string, channel: string, messageid: string, url: string, id: number }
    if (!Number.isNaN(number)) {
      targetImage = (await execute('SELECT * from goob WHERE id = $messageid', { $messageid: number }))[0]
    } else {
      number = Math.ceil(Math.random() * amountOfGoobs)
      targetImage = (await execute('WITH indexed as (SELECT *, COUNT(*) over(order by messageid) as theRow from goob) SELECT * from indexed WHERE theRow = $messageid', { $messageid: number }))[0]
    }

    // Fetch the original message
    const messageGuild = await interaction.client.guilds.fetch(targetImage.guild)
    const messageChannel = await messageGuild.channels.fetch(targetImage.channel)
    let message = undefined as Message | undefined

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (messageChannel?.isTextBased()) {
      message = await messageChannel.messages.fetch(targetImage.messageid).catch(() => undefined)
    }

    // Check if goob is a video or not and send the goob
    const data = await fetch(targetImage.url)
    const contentType = data.headers.get('content-type')

    let exampleEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`Goob #${targetImage.id}`)
      .setURL(message?.url ?? targetImage.url)
      .setTimestamp(message?.createdTimestamp ?? undefined)
      .setAuthor({ name: message?.author.username ?? 'deleted message', iconURL: message?.author.avatarURL() ?? undefined, url: message?.url })

    let files: any[] | undefined
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (contentType?.startsWith('video')) {
      files = [{ attachment: targetImage.url }]
    } else {
      exampleEmbed = exampleEmbed.setImage(targetImage.url)
    }

    const gulag = new ButtonBuilder()
      .setCustomId('Delete')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder()
      .addComponents(gulag) as any
    const response = await interaction.editReply({ embeds: [exampleEmbed], files, components: [row] })

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_00 })

    collector.on('collect', async i => {
      console.log(i.member)
      console.log((await checkMemberPermissions(i.member as GuildMember ?? undefined)))
      if (!(await checkMemberPermissions(i.member as GuildMember ?? undefined)).delete) {
        return
      }

      await deleteGoob(targetImage, interaction.client)
      await interaction.deleteReply()
    })
  }
}
