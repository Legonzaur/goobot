import { Client, Collection, Events, GatewayIntentBits } from 'discord.js'
import { discord_token } from './config.json'
import path from 'path'
import fs from 'fs'

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })
client.commands = new Collection()

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`)
})

const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

const promises = [] as Array<Promise<void>>

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  promises.push(import(filePath).then(({ default: command }) => {
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command)
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
    }
  }).catch(e => { console.log(e) }))
  // Set a new item in the Collection with the key as the command name and the value as the exported module
}

client.on(Events.InteractionCreate, async interaction => {
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
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
  }
})

// Log in to Discord with your client's token

void Promise.all(promises).then(async () => await client.login(discord_token)).catch(e => { console.log(e) })
