import { ActivityType, Client, Collection, Events, GatewayIntentBits } from 'discord.js'
import { discord_token } from './config.json'
import path from 'path'
import fs from 'fs'
import { checkMemberPermissions, execute, insertGoob, loadPreviousGoob } from './db'

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
})
client.commands = new Collection()

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
  await loadPreviousGoob(c)
  console.log('Loaded')
  const length = await execute('SELECT count(*) as count from goob')
  client.user?.setActivity(`${length[0].count as string} goobers`, {
    type: ActivityType.Listening
  })
})

const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'))

const promises = [] as Array<Promise<void>>

// Load Slash commands
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  promises.push(
    import(filePath)
      .then(({ default: command }) => {
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command)
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          )
        }
      })
      .catch((e) => {
        console.log(e)
      })
  )
}

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = interaction.client.commands.get(interaction.commandName)

  if (command === undefined) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true
      }).catch(e => {})
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true
      }).catch(e => {})
    }
  }
})

// Handle message sent in goober channel
client.on('messageCreate', async (e) => {
  if (e.guild === null) return
  if (e.member === null) return
  if (!e.channel.isTextBased()) return
  if (e.author.bot) return
  const channel = await execute(
    'SELECT * from tracked WHERE guild=$guild AND channel=$channel',
    { $channel: e.channelId, $guild: e.guildId }
  )
  if (!(await checkMemberPermissions(e.member)).create) return
  if (channel.length === 0) return

  insertGoob(e)
  const length = await execute('SELECT count(*) as count from goob')
  client.user?.setActivity(`${length[0].count as string} goobers`, {
    type: ActivityType.Listening
  })
  await execute(
    'UPDATE tracked SET last_message=$last_message WHERE guild=$guild AND channel=$channel',
    { $channel: e.channelId, $guild: e.guild, $last_message: e.id }
  )
})

// remove deleted goobers from databaser
client.on('messageDelete', async (e) => {
  void execute('DELETE FROM goob WHERE messageid=$messageid', {
    $messageid: e.id
  })
  const length = await execute('SELECT count(*) as count from goob')
  client.user?.setActivity(`${length[0].count as string} goobers`, {
    type: ActivityType.Listening
  })
})

// Log in to Discord with your client's token
void Promise.all(promises)
  .then(async () => await client.login(discord_token))
  .catch((e) => {
    console.log(e)
  })
