export interface SlashCommand {
  data: SlashCommandBuilder
  execute: (interaction: CommandInteraction) => Promise<void>
}

declare module 'discord.js' {
  export interface Collection<K, V> extends Collection<K, V> {
    filter: (value: V) => boolean
  }

  export interface Client<Ready extends boolean = boolean> extends Client<Ready> {
    commands: Collection<K, SlashCommand>
  }
}
