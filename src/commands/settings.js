const {SlashCommandBuilder} = require("@discordjs/builders");
const {CommandInteraction, MessageEmbed} = require("discord.js");
const {getSettings} = require("../util");

module.exports = {
    builder: new SlashCommandBuilder()
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
                        .addChannelType(0)
                    )
                )
                .addSubcommand(modlogChannel => modlogChannel
                    .setName("modlog_channel")
                    .setDescription("Set the public-facing modlog channel.")
                    .addChannelOption(channel => channel
                        .setName("channel")
                        .setDescription("New channel.")
                        .setRequired(true)
                        .addChannelType(0)
                    )
                )
            )
            .addSubcommandGroup(get => get
                .setName("get")
                .setDescription("List settings")
                .addSubcommand(all => all.setName("all").setDescription("List all options."))),
    /**
     * @param {CommandInteraction} interaction 
     */
    execute: async interaction => {
        if (!interaction.inGuild()) return await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle("Permission Error")
                    .setDescription("Not usable in DMs!")
                    .setColor("RED")
            ]
        });
        if (!interaction.member.permissions.has("MANAGE_CHANNELS")) return await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle("Permission Error")
                    .setDescription("You need the **Manage Channels** permission to view/change settings!")
                    .setColor("RED")
            ],
            ephemeral: true
        });
        
        const settings = await getSettings(interaction.guild);
        
        const {options} = interaction;
        const group = options.getSubcommandGroup();
        const subCommand = options.getSubcommand();


        console.log(`Got ${group} - ${subCommand}`);

        let reply;

        if (group === "set") {
            const setting = options.getSubcommand();
            switch(setting) {
                case "log_channel": 
                    const logChannel = options.getChannel("channel");
                    settings.logChannel = logChannel.id;
                    await settings.save();

                    reply = {embeds: [new MessageEmbed().setDescription(`Successfully set log channel to ${logChannel}.`).setColor("GREEN")]};
                    break;
                case "modlog_channel":
                    const modlogChannel = options.getChannel("channel");
                    settings.publicModlogChannel = modlogChannel.id;
                    await settings.save();

                    reply = {embeds: [new MessageEmbed().setDescription(`Successfully set modlog channel to ${modlogChannel}`).setColor("GREEN")]};
                    break;
            }


        } else if (group === "get" && subCommand === "all") {
            reply = {embeds: [
                new MessageEmbed()
                    .setTitle(`Settings for ${interaction.guild.name}`)
                    .addField(
                        "Logging",
                        `**Logging channel**: <#${settings.logChannel}> (${settings.logChannel})
**Modlog channel**: <#${settings.publicModlogChannel}> (${settings.publicModlogChannel})`
                    )
                    .setColor("BLUE")
            ]};
        };

        if (reply && !interaction.replied) return await interaction.reply(reply);
        return await interaction.reply({embeds: [new MessageEmbed().setDescription("Something went wrong!").setColor("RED")]});
    }
}