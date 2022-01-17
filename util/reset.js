const {sequelize} = require("../src/db");
module.exports = sequelize.sync({force: true});