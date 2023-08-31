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

    AddToEmbed(embed, viewOnly = false)
    {
        const roles = this.Roles.map(value => value.GetSectionAsField(this.Roles)).join("\n\n");
        const projectManagers = this.ProjectManagers.map(value => `<@${value}>`).join("\n");

        embed.addFields([
            {name: this.Title, value: this.Description},
            {name: "Image link", value: this.ImageLink === "" ? "None" : this.ImageLink},
            {name: "Links", value: this.Links === "" ? "None" : this.Links, inline: true},
            {name: "Roles", value: roles === "" ? "None" : roles, inline: true},
            {name: "\u200b", value: "\u200b"},
            {name: "Project managers", value: projectManagers === "" ? "None" : projectManagers, inline: true},
            {name: "Channel", value: `${this.ChannelId === "" ? "None" : `<#${this.ChannelId}>`}`, inline: true},
            {name: "Notify", value: this.Notify._value, inline: true},
            {name: "Auto chapter creation", value: this.AutoTask ? "✅" : "❌", inline: true},
        ]);

        if (viewOnly)
        {
            embed.addFields([
                {name: "Last update", value: `${time(this.LastActionDate, "R")}`, inline: true},
                {name: "Last task done", value: this.LastTaskDone === "" ? "None" : `Chapter ${this.LastTaskDone}`, inline: true},
                {name: "Last task created", value: this.Tasks.length === 0 ? "None" : `Chapter ${this.Tasks[this.Tasks.length - 1].Name}`, inline: true},
            ]);

            const advancement = [];

            for (let i = 0; i < this.Roles.length; i++)
            {
                advancement.push(`- **${this.Roles[i].Name}**: ${this.GetRoleAdvancement(i)}`);
            }

            embed.addFields([
                {name: "Advancement", value: advancement.join("\n")}
            ]);
        }

        if (this.ImageLink) embed.setImage(this.ImageLink);

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
    }
}