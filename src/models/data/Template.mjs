import {ProjectRole} from "./ProjectRole.mjs";

export class Template
{
    /** @type {string} */
    Name = ""
    /** @type {string} */
    Description = ""
    /** @type {ProjectRole[]} */
    Roles = []

    constructor()
    {
        this.Name = "";
        this.Description = "";
        this.Roles = [];
    }

    FromJson(data)
    {
        this.Name = data.Name;
        this.Description = data.Description;
        this.Roles = [];

        for (const role of data.Roles)
        {
            this.Roles.push(new ProjectRole().FromJson(role));
        }

        return this;
    }
}