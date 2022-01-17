const {GuildMember, Guild} = require("discord.js");
const {Settings} = require("./db");

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


module.exports = {
    timedOut,
    getSettings
}