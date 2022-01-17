const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction, MessageEmbed } = require("discord.js");
const { getSettings } = require("../util");

module.exports = {
    builder: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user.")
        .addUserOption(user => user
            .setName("user")
            .setDescription("The user to ban.")
            .setRequired(true)
        )
        .addStringOption(reason => reason
            .setName("reason")
            .setDescription("Reason for the ban.")
        )
        .addBooleanOption(silent => silent
            .setName("silent")
            .setDescription("Whether to make a public announcement or not. Defaults to true.")
        )
        .addIntegerOption(purge => purge
            .setName("purge")
            .setDescription("Number of days' worth of messages from this user to purge.")
            .setMinValue(0)
            .setMaxValue(7)
        ),

    /**
     * @param {CommandInteraction} interaction 
     */
    execute: async interaction => {
        if (!interaction.user) await interaction.user.fetch();
        if (!interaction.member) await interaction.member.fetch();
        if (!interaction.guild) await interaction.guild.fetch();

        const targetUser = interaction.options.getUser("user");
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const reason = interaction.options.getString("reason") ?? "No reason provided.";
        const purgeDays = interaction.options.getInteger("purge");
        const silent = interaction.options.getBoolean("silent");

        if (    !interaction.member.permissions.has("BAN_MEMBERS")  || 
                targetMember.permissions.has("ADMINISTRATOR")       || 
                targetMember.permissions.has("MANAGE_GUILD")        || 
                !targetMember.bannable                              )
                return await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle("Permission Error")
                            .setDescription(`Could not ban user ${targetUser} because you lack the necessary permissions.`)
                            .setColor("RED")
                    ]
                });

        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) return await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle("Permission Error")
                    .setDescription("You can't ban a user above you in the role hierarchy!")
                    .setColor("RED")
            ]
        })

        await targetMember.ban({
            reason: `Banned by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`,
            days: purgeDays ?? 0
        });

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setDescription(`Successfully banned ${targetUser}.`)
                    .setColor("GREEN")
            ]
        });

        // default to `false` for silent.
        if (!(silent ?? false)) {
            const settings = await getSettings(interaction.guild);
            if (!settings.publicModlogChannel) return; 
            
            const channel = await interaction.guild.channels.fetch(settings.publicModlogChannel).catch();
            if (!channel) return;
            
            await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`${targetUser.tag} has been banned.`)
                        .addField("User", `${targetUser}`, true)
                        .addField("Moderator", `${interaction.member}`, true)
                        .addField("Reason", reason)
                        .setColor("RED")
                        .setFooter({
                            text: `ban:${interaction.user.id}:${targetUser.id}`,
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                        .setTimestamp()
                ]
            }).catch();
        }
    }
}