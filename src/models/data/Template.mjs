import {ProjectRole} from "./ProjectRole.mjs";

export class Template
{
    /** @type {ProjectRole[]} */
    Roles = []

    constructor()
    {
        this.Roles = [];
    }

    FromJson(data)
    {
        this.Roles = [];

        for (const role of data.Roles)
        {
            this.Roles.push(new ProjectRole().FromJson(role));
        }

        return this;
    }
}