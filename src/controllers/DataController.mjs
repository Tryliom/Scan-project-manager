import fs from "fs";
import pkg, {Embed} from "discord.js";

import {Logger} from "../models/utility/Logger.mjs";
import {StringUtility} from "../models/utility/StringUtility.mjs";
import {Server} from "../models/data/Server.mjs";
import {Work} from "../models/data/Work.mjs";
import {ScanProjectManager} from "./ScanProjectManager.mjs";
import {Task} from "../models/data/Task.mjs";
import {EmbedUtility} from "../models/utility/EmbedUtility.mjs";
import {NotifyType} from "../models/data/Project.mjs";
import {DiscordUtility} from "../models/utility/DiscordUtility.mjs";

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

    IsMultipleProjectsInChannel(interaction)
    {
        if (this._servers[interaction.guildId] === undefined) return false;

        const projects = this._servers[interaction.guildId].Projects;
        let count = 0;

        for (const projectId in projects)
        {
            if (projects[projectId].ChannelId !== interaction.channelId) continue;

            count++;
        }

        return count > 1;
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
     * @param userId
     * @returns {{serverId: string, project: Project, tasks: Task[]}[]}
     * @constructor
     */
    GetProjectWithTasks(userId)
    {
        const projects = [];

        if (this._users[userId] === undefined) return projects;

        for (const work of this._users[userId])
        {
            const project = this.GetProject({guildId: work.ServerId}, work.ProjectId);
            const tasks = [];

            if (project === undefined) continue;

            for (const task of project.Tasks)
            {
                if (task.WorkIndex === project.Roles.length && project.ProjectManagers.includes(userId)) tasks.push(task);
                else if (project.Roles[task.WorkIndex].Users.includes(userId)) tasks.push(task);
            }

            if (tasks.length === 0) continue;

            projects.push({serverId: work.ServerId, project: project, tasks: tasks});
        }

        return projects;
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
        const tasks = [];

        if (project === undefined) return;

        for (const chapter of chapters)
        {
            project.Tasks.push(new Task().FromJson({Name: chapter.toString(), WorkIndex: 0}));
            tasks.push(project.Tasks[project.Tasks.length - 1]);
        }

        this.NotifyNewTasks(interaction, projectId, tasks);
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

    /**
     * @brief Mark the chapters as done for the work index.
     * @param interaction
     * @param projectId
     * @param chapters {number[] | string[]}
     * @constructor
     */
    DoneChapters(interaction, projectId, chapters)
    {
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        const doneTasks = [];
        const updatedTasks = [];

        for (const chapter of chapters)
        {
            const index = project.Tasks.findIndex(task => task.Name === chapter.toString());

            if (index !== -1)
            {
                project.Tasks[index].WorkIndex++;

                if (project.Tasks[index].WorkIndex === project.Roles.length)
                {
                    doneTasks.push(project.Tasks[index]);
                }
                else
                {
                    updatedTasks.push(project.Tasks[index]);

                    if (project.AutoTask && index === project.Tasks.length - 1)
                    {
                        project.Tasks.push(new Task().FromJson({Name: (parseFloat(project.Tasks[index].Name) + 1).toString(), WorkIndex: 0}));

                        updatedTasks.push(project.Tasks[project.Tasks.length - 1]);
                    }
                }
            }
        }

        this.NotifyTasksDone(interaction, projectId, doneTasks);
        this.NotifyTasksUpdate(interaction, projectId, updatedTasks);
    }

    // Notification functions

    NotifyNewProject(interaction, projectId)
    {
        // Notifies everyone in the project that they have been added to it and assign them the project
        /** @type {Object<string, string[]>} */
        const usersAssignments = {};
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        for (const role of project.Roles)
        {
            for (const userId of role.Users)
            {
                if (usersAssignments[userId] === undefined) usersAssignments[userId] = [];

                usersAssignments[userId].push(role.Name);
            }
        }

        for (const userId of project.ProjectManagers)
        {
            if (usersAssignments[userId] === undefined) usersAssignments[userId] = [];

            usersAssignments[userId].push("Project Manager");
        }

        for (const userId in usersAssignments)
        {
            if (this._users[userId] === undefined) this._users[userId] = [];

            this._users[userId].push(new Work().FromJson({ProjectId: projectId, ServerId: interaction.guildId}));

            const assignments = usersAssignments[userId].join(", ");

            try
            {
                ScanProjectManager.Instance.SendDM(userId, EmbedUtility.FormatMessageContent(
                    EmbedUtility.GetGoodEmbedMessage(`Project **${project.Title}** on server **${interaction.guild.name}** has been created.`, `You have been assigned as **${assignments}**.`)
                        .setFooter({text: `Use /tasks to see your new tasks`})
                )).then();
            }
            catch (error) {}
        }
    }

    NotifyProjectUpdate(interaction, oldProject, editedProject)
    {
        // Notifies only the people that have been added or removed from the project, separated messages for one that has been removed
        /** @type {Object<string, string[]>} */
        const newUsersAssignments = {};
        /** @type {Object<string, string[]>} */
        const removedUsersAssignments = {};

        for (const role of editedProject.Roles)
        {
            for (const userId of role.Users)
            {
                if (oldProject.Roles.findIndex(oldRole => oldRole.Name === role.Name && oldRole.Users.includes(userId)) !== -1) continue;

                if (newUsersAssignments[userId] === undefined) newUsersAssignments[userId] = [];

                newUsersAssignments[userId].push(role.Name);
            }
        }

        for (const role of oldProject.Roles)
        {
            for (const userId of role.Users)
            {
                if (editedProject.Roles.findIndex(newRole => newRole.Name === role.Name && newRole.Users.includes(userId)) !== -1) continue;

                if (removedUsersAssignments[userId] === undefined) removedUsersAssignments[userId] = [];

                removedUsersAssignments[userId].push(role.Name);
            }
        }

        for (const userId of editedProject.ProjectManagers)
        {
            if (oldProject.ProjectManagers.includes(userId)) continue;

            if (newUsersAssignments[userId] === undefined) newUsersAssignments[userId] = [];

            newUsersAssignments[userId].push("Project Manager");
        }

        for (const userId of oldProject.ProjectManagers)
        {
            if (editedProject.ProjectManagers.includes(userId)) continue;

            if (removedUsersAssignments[userId] === undefined) removedUsersAssignments[userId] = [];

            removedUsersAssignments[userId].push("Project Manager");
        }

        for (const userId in newUsersAssignments)
        {
            const messages = [`You have been assigned as **${newUsersAssignments[userId].join(", ")}**.`];

            if (removedUsersAssignments[userId] !== undefined)
            {
                messages.push(`You have been removed from **${removedUsersAssignments[userId].join(", ")}**.`);
            }

            try
            {
                ScanProjectManager.Instance.SendDM(userId, EmbedUtility.FormatMessageContent(
                    EmbedUtility.GetNeutralEmbedMessage(`Project **${editedProject.Title}** on server **${interaction.guild.name}** has been updated.`, messages.join("\n"))
                        .setFooter({text: `Use /tasks to see your new tasks`})
                )).then();
            }
            catch (error) {}
        }

        for (const userId in removedUsersAssignments)
        {
            if (newUsersAssignments[userId] !== undefined || !this._users[userId]) continue;

            // Remove work from user
            const index = this._users[userId].findIndex(work => work.ProjectId === editedProject.Id && work.ServerId === interaction.guildId);
            let description = `You have been removed from:\n- **${removedUsersAssignments[userId].join(", ")}**`;

            if (index !== -1 && editedProject.Roles.findIndex(role => role.Users.includes(userId)) === -1 && !editedProject.ProjectManagers.includes(userId))
            {
                this._users[userId].splice(index, 1);
            }
            else
            {
                const assignments = [];

                for (const role of editedProject.Roles)
                {
                    if (role.Users.includes(userId)) assignments.push(role.Name);
                }

                if (editedProject.ProjectManagers.includes(userId)) assignments.push("Project Manager");

                description += `\nBut you are still assigned as:\n- **${assignments.join(", ")}**`;
            }

            try
            {
                ScanProjectManager.Instance.SendDM(userId, EmbedUtility.FormatMessageContent(
                    EmbedUtility.GetBadEmbedMessage(`Removed role from project **${editedProject.Title}** on server **${interaction.guild.name}**`,
                        description)
                )).then();
            }
            catch (error) {}
        }
    }

    NotifyProjectDeletion(interaction, project)
    {
        // Notifies everyone in the project that they have been removed from it
        const users = [];

        for (const role of project.Roles)
        {
            for (const userId of role.Users)
            {
                if (!users.includes(userId)) users.push(userId);
            }
        }

        for (const userId of project.ProjectManagers)
        {
            if (!users.includes(userId)) users.push(userId);
        }

        for (const userId of users)
        {
            try
            {
                ScanProjectManager.Instance.SendDM(userId, EmbedUtility.FormatMessageContent(
                    EmbedUtility.GetBadEmbedMessage(`Project **${project.Title}** on server **${interaction.guild.name}** has been deleted.`)
                )).then();
            }
            catch (error) {}
        }
    }

    NotifyNewTasks(interaction, projectId, tasks)
    {
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        const users = [];

        // Just notify the users of the first role that they can start working on the new tasks
        for (const userId of project.Roles[0].Users)
        {
            users.push(userId);
        }

        let message = `**chapter${tasks.length > 1 ? "s" : ""} ${tasks[0].Name}${tasks.length > 1 ? " to " + tasks[tasks.length - 1].Name : ""}**`;
        let title = `New chapter${tasks.length > 1 ? "s" : ""} in project **${project.Title}**`;

        if (project.Notify === NotifyType.dm)
        {
            title += ` on server **${interaction.guild.name}**`;
        }

        const embed = EmbedUtility.GetGoodEmbedMessage(title);

        if (project.ImageLink.startsWith("http"))
        {
            embed.setImage(project.ImageLink);
        }

        embed.setDescription(`You can start working on ${message} (${project.Roles[0].Name})`);
        embed.setFooter({text: `Use /tasks to see your new tasks`});

        this.SendMessage(interaction, projectId, users, embed);
    }

    /**
     *
     * @param interaction
     * @param projectId
     * @param tasks {Task[]}
     * @constructor
     */
    NotifyTasksUpdate(interaction, projectId, tasks)
    {
        if (tasks.length === 0) return;

        // Notify the users that have been assigned to the tasks that they can start working on them
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        /** @type {Object<string, Object<string, string[]>>} */
        const usersAssignments = {};

        for (const task of tasks)
        {
            const roleToNotify = project.Roles[task.WorkIndex];

            for (const userId of roleToNotify.Users)
            {
                if (usersAssignments[userId] === undefined) usersAssignments[userId] = {};
                if (usersAssignments[userId][roleToNotify.Name] === undefined) usersAssignments[userId][roleToNotify.Name] = [];

                usersAssignments[userId][roleToNotify.Name].push(task.Name);
            }
        }

        // Assemble all users that have been assigned to the same roles
        const roles = {};

        for (const userId in usersAssignments)
        {
            for (const role in usersAssignments[userId])
            {
                if (roles[role] === undefined) roles[role] = [];

                roles[role].push(userId);
            }
        }

        // Notify the users of the roles that they can start working on the new tasks
        for (const role in roles)
        {
            let message = "";

            message = `- **${role}**: ${usersAssignments[roles[role][0]][role].join(", ")}`;
            let title = `New chapter${tasks.length > 1 ? "s" : ""} in project **${project.Title}**`;

            if (project.Notify === NotifyType.dm)
            {
                title += ` on server **${interaction.guild.name}**`;
            }

            const embed = EmbedUtility.GetGoodEmbedMessage(title, `You can start working on the following chapters:\n${message}`);

            if (project.ImageLink.startsWith("http"))
            {
                embed.setImage(project.ImageLink);
            }

            embed.setFooter({text: `Use /tasks to see your new tasks`});

            this.SendMessage(interaction, projectId, roles[role], embed);
        }
    }

    /**
     *
     * @param interaction
     * @param projectId
     * @param tasks {Task[]}
     * @constructor
     */
    NotifyTasksDone(interaction, projectId, tasks)
    {
        if (tasks.length === 0) return;

        // Notify the project managers that the tasks are done
        const project = this.GetProject(interaction, projectId);

        if (project === undefined) return;

        let message = "";

        for (const task of tasks)
        {
            message += `**${task.Name}**\n`;
        }

        let title = `Chapter${tasks.length > 1 ? "s" : ""} done`;

        if (project.Notify === NotifyType.dm)
        {
            title += ` in project **${project.Title}** on server **${interaction.guild.name}**`;
        }

        this.SendMessage(interaction, projectId, project.ProjectManagers, EmbedUtility.GetGoodEmbedMessage(title, `The following chapters are done:\n${message}`));
    }

    SendMessage(interaction, projectId, users, embed)
    {
        const project = this.GetProject(interaction, projectId);
        const message = EmbedUtility.FormatMessageContent(embed);

        if (project === undefined) return;

        if (project.Notify === NotifyType.dm)
        {
            for (const userId of users)
            {
                try
                {
                    ScanProjectManager.Instance.SendDM(userId, message).then();
                }
                catch (error) {}
            }
        }
        else
        {
            message.content = `${users.map(userId => `<@${userId}>`).join(" ")}`;

            try
            {
                ScanProjectManager.Instance.SendMessageInChannel(interaction.guildId, project.ChannelId, message).then();
            }
            catch (error) {}
        }
    }
}







































