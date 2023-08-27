import {EmojiUtility} from "../utility/EmojiUtility.mjs";

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

    GetSectionAsField(isSelected = false)
    {
        const users = [];

        for (let userID of this.Users)
        {
            users.push(`<@${userID}>`);
        }

        if (users.length === 0)
        {
            users.push("No user");
        }

        if (isSelected)
        {
            return `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Left)} **${this.Name}**: ${users.join(", ")}`;
        }

        return `- **${this.Name}**: ${users.join(", ")}`;
    }
}