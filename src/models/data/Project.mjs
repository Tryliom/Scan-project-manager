import { Link } from "./Link.mjs";
import {ProjectRole} from "./ProjectRole.mjs";
import {Task} from "./Task.mjs";

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
    Title = ""
    /** @type {string} */
    Description = ""
    /** @type {string} */
    ImageLink = ""
    /** @type {Link[]} */
    Links = []
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
        this.Title = "";
        this.Description = "";
        this.ImageLink = "";
        this.Links = [];
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
        this.Title = data.Title;
        this.Description = data.Description;
        this.ImageLink = data.ImageLink;
        this.Links = [];
        this.ChannelId = data.ChannelId;
        this.Notify = data.Notify;
        this.AutoTask = data.AutoTask;
        this.ProjectManagers = data.ProjectManagers;
        this.Roles = [];
        this.Tasks = [];
        this.LastTaskDone = data.LastTaskDone;
        this.LastActionDate = data.LastActionDate;

        for (const link of data.Links)
        {
            this.Links.push(new Link().FromJson(link));
        }

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
}