import { REST, Routes } from 'discord.js'
import { discord_app_id, discord_guild_id, discord_token } from './config.json'
import path from 'path'
import fs from 'fs'
import { type SlashCommand } from './@types/discordjs'

const commands = [] as SlashCommand[]
// Grab all the command files from the commands directory you created earlier
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

const promises = [] as Array<Promise<void>>
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  promises.push(import(filePath).then(({ default: command, global }) => {
    if (global === true) return
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
    }
  }))
  // Set a new item in the Collection with the key as the command name and the value as the exported module
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(discord_token)

// and deploy your commands!

void Promise.all(promises).then(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`)

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(discord_app_id, discord_guild_id),
      { body: commands }

    )

    console.log(`Successfully reloaded ${(data as string[]).length} application (/) commands.`)
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
})
