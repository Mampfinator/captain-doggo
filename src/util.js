const {GuildMember, Guild} = require("discord.js");
const {SlashCommandBuilder} = require("@discordjs/builders");
const {Settings} = require("./db");
const { readdirSync } = require("fs"); 
/**
 * @param {GuildMember} oldMember 
 * @param {GuildMember} newMember 
 */
function timedOut(oldMember, newMember) {
    return (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled());
}
/**
 * 
 * @param {Guild} guild 
 */

async function getSettings(guild) {
    if (!guild || !guild.id) throw new TypeError("Did not pass valid guild!");
    return await Settings.findOne({where: {guildId: guild.id}}).catch(console.error); 
}


/**
 * @param {string} path - path to the commands folder. 
 * @returns - the the commands sorted by builders and an execution map.
 */
function loadCommands(path) {
    const files = readdirSync(path).filter(file => file.endsWith(".js")).map(file => `${path}/${file}`);
    console.log(`Found ${files.length} commands in ${path}: `, files);
    /**
     * @type {Map<string, Function>}
     */
    const executors = new Map();
    /**
     * @type {Array<SlashCommandBuilder>}
     */
    const builders = [];

    for (const file of files) {
        const { builder, execute } = require(file);
        const name = builder.name;
        builders.push(builder);
        executors.set(name, execute);
    }

    return {builders, executors};
}


module.exports = {
    timedOut,
    getSettings,
    loadCommands
}