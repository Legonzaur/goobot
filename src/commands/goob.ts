import {
  type CommandInteraction,
  SlashCommandBuilder, EmbedBuilder, type Message, ButtonStyle, ButtonBuilder, ActionRowBuilder, ComponentType
} from 'discord.js'
import { execute } from '../db'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goob')
    .setDescription('meow').addIntegerOption(option =>
      option
        .setName('gooberid')
        .setDescription('The goob to see')
        .setRequired(false)),
  async execute (interaction: CommandInteraction) {
    // Pick the right goober
    const amountOfGoobs = (await execute('SELECT COUNT(*) as totalweight from goob'))[0].totalweight
    let number = Number(interaction.options.get('gooberid')?.value)
    let targetImage
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
      .setTitle(`Goob #${targetImage.id as number}`)
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
    const response = await interaction.reply({ embeds: [exampleEmbed], files, components: [row] })

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_00 })

    collector.on('collect', async i => {
      const roles = (await execute('SELECT * from permissions WHERE guild = $guild', { $guild: i.guild?.id }))
      console.log(roles)
      console.log(i.member?.roles)
    })
  }
}
