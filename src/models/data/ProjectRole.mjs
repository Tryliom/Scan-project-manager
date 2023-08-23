export class ProjectRole
{
    /** @type {string} */
    Name = "";
    /** @type {string[]} */
    Users= [];

    constructor(data)
    {
        this.Name = data.Name;
        this.Users = data.Users;
    }
}