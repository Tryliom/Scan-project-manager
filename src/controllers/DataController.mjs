import fs from "fs";
import pkg from "discord.js";

import {Logger} from "../models/utility/Logger.mjs";
import {StringUtility} from "../models/utility/StringUtility.mjs";
import {Server} from "../models/data/Server.mjs";
import {Work} from "../models/data/Work.mjs";
import {ScanProjectManager} from "./ScanProjectManager.mjs";
import {Task} from "../models/data/Task.mjs";

const {CommandInteraction} = pkg;

function SaveJsonToFile(path, content)
{
    SaveFile(path, JSON.stringify(content));
}

function SaveFile(path, content)
{
    if (content === "") ScanProjectManager.Instance.EmergencyExit("Users file is empty");
    else                fs.writeFileSync(path, content);
}

function LoadFile(path)
{
    if (fs.existsSync(path))
    {
        return JSON.parse(fs.readFileSync(path));
    }
    else
    {
        return {};
    }
}

const DataPath = "./assets/data/";
const BackupPath = "./assets/backup/";
const UsersName = "users.json";
const ServersName = "servers.json";

export class DataController
{
    /** @type {Object<string, Work[]>} */
    _users
    /** @type {Object<string, Server>} */
    _servers

    constructor()
    {
        this._servers = {};
        this._users = {};

        // Load data from file
        this._users = LoadFile(DataPath + UsersName);
        this._servers = LoadFile(DataPath + ServersName);

        // Convert data to User objects
        for (const userId in this._users)
        {
            const works = this._users[userId];
            this._users[userId] = [];

            for (const work of works)
            {
                this._users[userId].push(new Work().FromJson(work));
            }
        }

        // Convert data to Server objects
        for (const serverId in this._servers)
        {
            this._servers[serverId] = new Server().FromJson(this._servers[serverId]);
        }
    }

    SaveAll()
    {
        SaveJsonToFile(DataPath + UsersName, this._users);
        SaveJsonToFile(DataPath + ServersName, this._servers);

        Logger.Log("Saved all data");
    }

    Backup()
    {
        const usersLength = Object.keys(this._users).length;
        const serversLength = Object.keys(this._servers).length;

        if (usersLength === 0 && serversLength === 0) return;

        const path = BackupPath + StringUtility.FormatDate(new Date());

        if (!fs.existsSync(path)) fs.mkdirSync(path);

        if (usersLength > 0)    SaveJsonToFile(`${path}/${UsersName}`, this._users);
        if (serversLength > 0)  SaveJsonToFile(`${path}/${ServersName}`, this._servers);

        Logger.Log("Backed up all data");
    }

    /**
     * @brief Initialize the user and server where the interaction was made if they don't exist.
     * @param interaction {CommandInteraction}
     */
    InitData(interaction)
    {
        if (interaction.guildId !== undefined)
        {
            this.CreateServerIfNotExist(interaction.guildId);
        }

        this.CreateUserIfNotExist(interaction.user.id);
    }

    CreateUserIfNotExist(userId)
    {
        if (this._users[userId] === undefined)
        {
            this._users[userId] = [];
        }
    }

    CreateServerIfNotExist(serverId)
    {
        if (this._servers[serverId] === undefined)
        {
            this._servers[serverId] = new Server();
        }
    }

    // Information functions

    /**
     * @brief Get the project from the channel where the interaction was made.
     * @param {CommandInteraction} interaction
     * @returns {Project | undefined}
     * */
    GetProjectFromChannel(interaction)
    {
        if (this._servers[interaction.guildId] === undefined) return undefined;

        const projects = this._servers[interaction.guildId].Projects;

        for (const projectId in projects)
        {
            if (projects[projectId].ChannelId !== interaction.channelId) continue;

            return projects[projectId];
        }

        return undefined;
    }

    /**
     * @brief Get the templates from the server where the interaction was made.
     * @param {CommandInteraction} interaction
     * @returns {Template[] | undefined}
     * */
    GetTemplates(interaction)
    {
        if (this._servers[interaction.guildId] === undefined) return undefined;

        return this._servers[interaction.guildId].Templates;
    }

    /**
     * @brief Get the projects from the server where the interaction was made.
     * @param {CommandInteraction} interaction
     * @returns {Object<string, Project> | undefined}
     */
    GetProjects(interaction)
    {
        if (this._servers[interaction.guildId] === undefined) return undefined;

        return this._servers[interaction.guildId].Projects;
    }

    /**
     * @brief Add a template to the server where the interaction was made.
     */
    AddTemplate(interaction, template)
    {
        this.CreateServerIfNotExist(interaction.guildId);

        this._servers[interaction.guildId].Templates.push(template);
    }

    /**
     * @brief Add a project to the server where the interaction was made.
     */
    AddProject(interaction, project)
    {
        this.CreateServerIfNotExist(interaction.guildId);

        this._servers[interaction.guildId].Projects[project.Id] = project;
    }

    GetProject(interaction, projectId)
    {
        if (this._servers[interaction.guildId] === undefined) return undefined;

        return this._servers[interaction.guildId].Projects[projectId];
    }

    /**
     *
     * @param interaction
     * @param projectId
     * @param chapters {number[]}
     * @constructor
     */
    AddChapters(interaction, projectId, chapters)
    {
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        for (const chapter of chapters)
        {
            project.Tasks.push(new Task().FromJson({Name: chapter.toString(), WorkIndex: 0}));
        }

        //TODO: Notify the first role of the project that there are new chapters to do
    }

    /**
     *
     * @param interaction
     * @param projectId
     * @param chapters {number[]}
     * @constructor
     */
    RemoveChapters(interaction, projectId, chapters)
    {
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        for (const chapter of chapters)
        {
            const index = project.Tasks.findIndex(task => task.Name === chapter.toString());

            if (index !== -1) project.Tasks.splice(index, 1);
        }
    }
}