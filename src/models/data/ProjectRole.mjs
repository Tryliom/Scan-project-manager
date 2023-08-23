import { Snowflake } from "discord.js";

export class ProjectRole
{
    /** @type {string} */
    Name = "";
    /** @type {Snowflake[]} */
    Users= [];

    constructor(data)
    {
        this.Name = data.Name;
        this.Users = data.Users;
    }
}