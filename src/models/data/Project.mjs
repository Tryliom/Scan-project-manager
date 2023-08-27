import {ProjectRole} from "./ProjectRole.mjs";
import {Task} from "./Task.mjs";
import {v4} from "uuid";

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
        this.LastActionDate = data.LastActionDate;

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

    AddToEmbed(embed)
    {
        const roles = this.Roles.map(value => value.GetSectionAsField()).join("\n\n");
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

        if (this.ImageLink) embed.setImage(this.ImageLink);

        return embed;
    }
}