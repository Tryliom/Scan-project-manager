export class ProjectRole
{
    /** @type {string} */
    Name = "";
    /** @type {string[]} */
    Users= [];

    constructor()
    {
        this.Name = "";
        this.Users = [];
    }

    FromJson(data)
    {
        this.Name = data.Name;
        this.Users = data.Users;

        return this;
    }

    AddUser(userId)
    {
        if (!this.Users.includes(userId))
        {
            this.Users.push(userId);
        }
    }

    RemoveUser(userId)
    {
        if (this.Users.includes(userId))
        {
            this.Users.splice(this.Users.indexOf(userId), 1);
        }
    }
}