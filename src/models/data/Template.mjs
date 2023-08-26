import {ProjectRole} from "./ProjectRole.mjs";
import {EmojiUtility} from "../utility/EmojiUtility.mjs";

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
        this.Name = "Default template";
        this.Description = "A default template.";
        this.Roles =
        [
            new ProjectRole().FromJson({Name: "Clean", Users: []}),
            new ProjectRole().FromJson({Name: "Translation", Users: []}),
            new ProjectRole().FromJson({Name: "Check", Users: []}),
            new ProjectRole().FromJson({Name: "Edit", Users: []}),
            new ProjectRole().FromJson({Name: "Quality check", Users: []})
        ];
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

    GetSectionsAsFields(indexSelected = -1)
    {
        const sections = [];

        for (let role of this.Roles)
        {
            const index = this.Roles.indexOf(role);
            const users = [];
            let name = role.Name;

            if (index === indexSelected)
            {
                name = `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Left)} **${name}**`;
            }

            for (let userID of role.Users)
            {
                users.push(`<@${userID}>`);
            }

            if (users.length === 0)
            {
                users.push("No users");
            }

            sections.push(`${name}: ${users.join("\n")}`);
        }

        if (sections.length === 0)
        {
            sections.push("No sections");
        }

        return {name: "Sections", value: sections.join("\n\n")};
    }
}