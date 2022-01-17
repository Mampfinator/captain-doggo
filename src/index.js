// TODO: move Client events to dedicated modules in src/events
const { config } = require("dotenv"); config();
const { Client, Intents, MessageEmbed } = require("discord.js"); 
const { Settings, sequelize } = require("./db");
//const { builders , executors } = require("./commands");
const { timedOut, getSettings, loadCommands } = require("./util");
const { executors, builders } = loadCommands(`${__dirname}/commands`);


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

// TODO: re-emit more detailed member updates.
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    if (oldMember.partial) await oldMember.fetch();
    if (timedOut(oldMember, newMember)) { // `client.emit("guildMemberTimedOut", oldMember, newMember)` here, rest of code in new listener.
        const auditLog = await newMember.guild.fetchAuditLogs({
            type: "MEMBER_UPDATE",
            limit: 3,
        });

        const { reason, executor } = auditLog.entries.find(log =>
            log.changes.find(change => change.key === "communication_disabled_until") !== undefined && // find a timeout
            log.target.id === newMember.id &&                                                          // filter by member
            (log.createdAt.valueOf() + 120000) > Date.now()                                            // filter by age (2 minutes hopefully good enough)
        ) ?? {};

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
                            .setFooter({text: `timeout:${executor.id}:${newMember.id}`})
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
    console.log(`Logged in as ${client.user.tag} (${client.user.id}).`);
    await sequelize.sync({alter: true});

    // sync guild settings & create new settings row where applicable.
    for (const guild of client.guilds.cache.values()) {
        await guild.members.fetch();
        if (!await getSettings(guild)) {
            await Settings.create({
                guildId: guild.id
            });
        }
    }

    // register commands
    await client.application?.fetch();
    for (const command of builders.map(b => b.toJSON())) {
        await client.application.commands.create(command);
    }
});


// create new settings for a guild when first joining it.
client.on("guildCreate", async guild => {
    if (await getSettings(guild)) return;
    await Settings.create({
        guildId: guild.id
    });
});



client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const command = interaction.commandName;
    const executor = executors.get(command);
    if (executor && typeof executor === "function") await executor(interaction);
});

client.login(process.env.DISCORD_TOKEN);