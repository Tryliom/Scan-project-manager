import {ProjectRole} from "./ProjectRole.mjs";
import {Task} from "./Task.mjs";
import {v4} from "uuid";
import {time} from "discord.js";

export class NotifyType
{
    static channel = new NotifyType("Channel");
    static dm = new NotifyType("Private message");

    /** @type {string} */
    _value

    constructor(value)
    {
        this._value = value;
    }
}

export class Project
{
    /** @type {string} */
    Id = ""
    /** @type {string} */
    Title = ""
    /** @type {string} */
    Description = ""
    /** @type {string} */
    ImageLink = ""
    /** @type {string} */
    Links = ""
    /** @type {string} */
    ChannelId = ""
    /** @type {NotifyType} */
    Notify = NotifyType.channel
    /** @type {boolean} */
    AutoTask = false
    /**
     * @brief The user ids that are allowed to manage the project.
     * @type {string[]} */
    ProjectManagers = []
    /** @type {ProjectRole[]} */
    Roles = []
    /** @type {Task[]} */
    Tasks = []
    /**
     * @brief The name of the last task that was done.
     * @type {string} */
    LastTaskDone = ""
    /**
     * @brief The date of the last action that was done on the first task to do.
     * @type {Date} */
    LastActionDate = new Date()
    /** @type {boolean} */
    InactivityNotified = false

    constructor()
    {
        this.Id = v4();
        this.Title = "Project name";
        this.Description = "Project description";
        this.ImageLink = "";
        this.Links = "";
        this.ChannelId = "";
        this.Notify = NotifyType.channel;
        this.AutoTask = false;
        this.ProjectManagers = [];
        this.Roles = [];
        this.Tasks = [];
        this.LastTaskDone = "";
        this.LastActionDate = new Date();
        this.InactivityNotified = false;
    }

    FromJson(data)
    {
        this.Id = data.Id;
        this.Title = data.Title;
        this.Description = data.Description;
        this.ImageLink = data.ImageLink;
        this.Links = data.Links;
        this.ChannelId = data.ChannelId;
        this.Notify = data.Notify;
        this.AutoTask = data.AutoTask;
        this.ProjectManagers = data.ProjectManagers;
        this.Roles = [];
        this.Tasks = [];
        this.LastTaskDone = data.LastTaskDone;
        this.LastActionDate = new Date(data.LastActionDate);
        this.InactivityNotified = data.InactivityNotified;

        for (const role of data.Roles)
        {
            this.Roles.push(new ProjectRole().FromJson(role));
        }

        for (const task of data.Tasks)
        {
            this.Tasks.push(new Task().FromJson(task));
        }

        return this;
    }

    AddToEmbed(embed, extraInfo = false, onlyBasicInfo = false, withTitleAndDescription = true)
    {
        const roles = this.Roles.map(value => value.GetSectionAsField(this.Roles)).join("\n\n");
        const projectManagers = this.ProjectManagers.map(value => `<@${value}>`).join("\n");
        const fields = [];

        if (withTitleAndDescription) fields.push({name: this.Title, value: this.Description});
        if (!onlyBasicInfo) fields.push({name: "Image link", value: this.ImageLink === "" ? "None" : this.ImageLink});
        fields.push({name: "Links", value: this.Links === "" ? "None" : this.Links, inline: true});
        fields.push({name: "Roles", value: roles === "" ? "None" : roles, inline: true});
        fields.push({name: "\u200b", value: "\u200b"});
        fields.push({name: "Project managers", value: projectManagers === "" ? "None" : projectManagers, inline: true});
        if (!onlyBasicInfo) fields.push({name: "Channel", value: `${this.ChannelId === "" ? "None" : `<#${this.ChannelId}>`}`, inline: true});
        if (!onlyBasicInfo) fields.push({name: "Notify", value: this.Notify._value, inline: true});
        if (!onlyBasicInfo) fields.push({name: "Auto chapter creation", value: this.AutoTask ? "✅" : "❌", inline: true});

        if (extraInfo)
        {
            fields.push({name: "Last update", value: `${time(this.LastActionDate, "R")}`, inline: true});
            fields.push({name: "Last task done", value: this.LastTaskDone === "" ? "None" : `Chapter ${this.LastTaskDone}`, inline: true});
            fields.push({name: "Last task created", value: this.Tasks.length === 0 ? "None" : `Chapter ${this.Tasks[this.Tasks.length - 1].Name}`, inline: true});

            const advancement = [];

            for (let i = 0; i < this.Roles.length; i++)
            {
                advancement.push(`- **${this.Roles[i].Name}**: ${this.GetRoleAdvancement(i)}`);
            }

            advancement.push(`- **Last chapter published**: ${this.LastTaskDone === "" ? "None" : `Chapter ${this.LastTaskDone}`}`);

            fields.push({name: "Advancement", value: advancement.join("\n")});
        }

        embed.addFields(fields);

        if (this.ImageLink && this.ImageLink.startsWith("http")) embed.setImage(this.ImageLink);

        return embed;
    }

    GetRoleAdvancement(roleIndex)
    {
        for (const task of this.Tasks)
        {
            if (task.Completion[roleIndex]) continue;
            else return `Chapter ${task.Name}`;
        }

        return "All done";
    }

    UpdateLastActionDate()
    {
        this.LastActionDate = new Date();
        this.InactivityNotified = false;
    }
}