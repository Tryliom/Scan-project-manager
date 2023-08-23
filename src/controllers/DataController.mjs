import fs from "fs";
import pkg from "discord.js";

import {Logger} from "../models/utility/Logger.mjs";
import {StringUtility} from "../models/utility/StringUtility.mjs";
import {Server} from "../models/data/Server.mjs";
import {Work} from "../models/data/Work.mjs";

const {Interaction} = pkg;

function SaveJsonToFile(path, content)
{
    return SaveFile(path, JSON.stringify(content));
}

function SaveFile(path, content)
{
    if (content === "") return false;

    fs.writeFileSync(path, content);

    return true;
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
    /** @type {ScanProjectManager} */
    _scanProjectManager
    /** @type {Object<string, Work[]>} */
    _users
    /** @type {Object<string, Server>} */
    _servers

    constructor(scanProjectManager)
    {
        this._scanProjectManager = scanProjectManager;
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
                this._users[userId].push(new Work(work));
            }
        }

        // Convert data to Server objects
        for (const serverId in this._servers)
        {
            this._servers[serverId] = new Server(this._servers[serverId]);
        }
    }

    SaveAll()
    {
        if (!SaveJsonToFile(DataPath + UsersName, this._users))
        {
            return this._scanProjectManager.EmergencyExit("Users file is empty");
        }

        if (!SaveJsonToFile(DataPath + ServersName, this._servers))
        {
            return this._scanProjectManager.EmergencyExit("Servers file is empty");
        }

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
     * @param interaction {Interaction}
     */
    InitData(interaction)
    {
        if (interaction.guild)
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
            this._servers[serverId] = Object.create(Server.prototype);
        }
    }

    // Information functions

    /**
     * @brief Get the project from the channel where the interaction was made.
     * @param {Interaction} interaction
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
}