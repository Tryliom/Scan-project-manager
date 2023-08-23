import {ProjectRole} from "./ProjectRole.mjs";

export class Template
{
    /** @type {ProjectRole[]} */
    Roles = []

    constructor(data)
    {
        this.Roles = [];

        for (const role of data.Roles)
        {
            this.Roles.push(new ProjectRole(role));
        }
    }
}