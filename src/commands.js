// this is a mess. But it's good enough for few commands.
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const { getSettings } = require("./util");

module.exports = {
    builders: [
        new SlashCommandBuilder()
            .setName("settings")
            .setDescription("This bot's settings. Duh.")
            .addSubcommandGroup(set => set
                .setName("set")
                .setDescription("Modify settings.")
                .addSubcommand(logChannel => logChannel
                    .setName("log_channel").setDescription("Where the bot logs things")
                    .addChannelOption(channel => channel
                        .setName("channel")
                        .setDescription("New channel.")
                        .setRequired(true)
                        .addChannelTypes([
                            0
                        ])
                    )
                )
            ).addSubcommandGroup(get => get.
                setName("get").setDescription("List all the settings."))
    ],
    executors: new Map()
        .set("settings", async interaction => {
            if (!interaction.inGuild()) return await interaction.reply({embeds: [new MessageEmbed().setDescription("Not usable in DMs!").setColor("RED")]});
            if (!interaction.member.permissions.has("MANAGE_CHANNELS")) return await interaction.reply({embeds: [new MessageEmbed().setDescription("You need the **Manage Channels** permission to view/change settings!")], ephemeral: true});
            
            const settings = await getSettings(interaction.guild);
            
            const {options} = interaction;
            const group = options.getSubcommandGroup();

            let reply;

            if (group === "set") {
                const setting = options.getSubcommand();
                switch(setting) {
                    case "log_channel": 
                        const channel = options.get("channel").channel;
                        settings.logChannel = channel.id;
                        await settings.save();

                        reply = {embeds: [new MessageEmbed().setDescription(`Successfully set log channel to ${channel}.`).setColor("GREEN")]}
                        break;
                }


            } else if (group === "get") {
                reply = {
                    content: JSON.stringify(settings.toJSON())
                }
            };

            if (reply && !interaction.replied) return await interaction.reply(reply);
            return await interaction.reply({embeds: [new MessageEmbed().setDescription("Something went wrong!").setColor("RED")]});
        })
}