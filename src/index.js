const { config } = require("dotenv"); config();
const { Client, Intents, MessageEmbed } = require("discord.js"); 
const { Settings, sequelize } = require("./db");
const { builders , executors } = require("./commands");
const { timedOut, getSettings } = require("./util");

process.on("uncaughtException", error => {
    console.error("Uncaught exception: ", error)
});


const client = new Client({
    intents: [
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES
    ]
});



client.on("guildMemberUpdate", async (oldMember, newMember) => {
    if (oldMember.partial) await oldMember.fetch();
    if (timedOut(oldMember, newMember)) {
        const auditLog = await newMember.guild.fetchAuditLogs({
            type: "MEMBER_UPDATE",
            limit: 1
        });

        const { reason, executor } = auditLog.entries.find(log => log.target.id === newMember.id) ?? {};
        console.log(`User ${newMember.displayName} has been timed out for reason ${reason}.`);

        const settings = await getSettings(newMember.guild);
        
        if (settings.logChannel) {
            const channel = await newMember.guild.channels.fetch(settings.logChannel);
            if (channel) {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL()})
                            .setDescription(`${newMember.user} has been timed out by ${executor}.`)
                            .addField("Timed out until", `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp/1000)}:T>`)
                            .addField("Reason", reason ?? "No reason provided.")
                            .setColor("RED")
                    ]
                }).catch(console.error);
            }
        }

        await newMember.user.send({
            embeds: [
                new MessageEmbed()
                    .setTitle("You have been timed out!")
                    .setDescription(`You have been timed out until <t:${Math.floor(newMember.communicationDisabledUntilTimestamp/1000)}:T> in ${newMember.guild.name} for the following reason: \n\`\`\`\n${reason ?? "No reason provided!"}\n\`\`\``)
                    .setColor("RED")
                    .setThumbnail(newMember.guild.iconURL())
            ]
        }).catch(console.error);
    }
});

client.on("ready", async () => {
    await sequelize.sync({alter: {
        drop: false
    }});

    for (const guild of client.guilds.cache.values()) {
        await guild.members.fetch();
        if (!await getSettings(guild)) {
            await Settings.create({
                guildId: guild.id
            });
        }
    }

    await client.application?.fetch();
    for (const command of builders.map(b => b.toJSON())) {
        await client.application.commands.create(command);
    }
});


client.on("guildCreate", async guild => {
    if (await getSettings(guild)) return;
    await Settings.create({
        guildId: guild.id
    })
});



client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const command = interaction.commandName;
    const executor = executors.get(command);
    if (executor && typeof executor === "function") await executor(interaction);
});

client.login(process.env.DISCORD_TOKEN);