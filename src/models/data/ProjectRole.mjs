import {EmojiUtility} from "../utility/EmojiUtility.mjs";

export class ProjectRole
{
    /** @type {string} */
    Name = "";
    /** @type {string[]} */
    Users= [];
    /**
     * @brief If the role is moving up to a specific index role, if not it's -1
     * @type {number} */
    Moving = -1

    constructor()
    {
        this.Name = "";
        this.Users = [];
        this.Moving = -1;
    }

    FromJson(data)
    {
        this.Name = data.Name ?? "";
        this.Users = data.Users ?? [];
        this.Moving = data.Moving ?? -1;

        return this;
    }

    GetSectionAsField(projectRoles, isSelected = false)
    {
        const users = [];
        let moving = "";

        if (this.Moving !== -1)
        {
            moving = ` -> ${projectRoles[this.Moving].Name}`;
        }

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
            return `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Right)} **${this.Name}**${moving}: ${users.join(", ")}`;
        }

        return `- **${this.Name}**${moving}: ${users.join(", ")}`;
    }
}