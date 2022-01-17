const { Sequelize, Model, DataTypes } = require("sequelize");
const sequelize = new Sequelize(`sqlite://captain-doggo.sqlite`);

class Settings extends Model {}
Settings.init(
    {
        guildId: {
            type: DataTypes.STRING,
            unique: true
        },
        logChannel: DataTypes.STRING,
    }, {
        sequelize,
        timestamps: false,
    }
);

module.exports = {
    sequelize,
    Settings,
}