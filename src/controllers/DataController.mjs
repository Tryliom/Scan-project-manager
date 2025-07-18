import fs from "fs";
import pkg, {time} from "discord.js";

import {Logger} from "../models/utility/Logger.mjs";
import {StringUtility} from "../models/utility/StringUtility.mjs";
import {Server} from "../models/data/Server.mjs";
import {Work} from "../models/data/Work.mjs";
import {ScanProjectManager} from "./ScanProjectManager.mjs";
import {Task} from "../models/data/Task.mjs";
import {EmbedUtility} from "../models/utility/EmbedUtility.mjs";
import {NotifyType} from "../models/data/Project.mjs";
import {StatsType, TimeType, TimeTypeToString} from "../models/data/ServerStats.mjs";
import {Changelog} from "../models/data/Changelog.mjs";
import {BotInfo} from "../models/data/BotInfo.mjs";

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
        return undefined;
    }
}

const DataPath = "./assets/data/";
const BackupPath = "./assets/backup/";
const UsersName = "users.json";
const ServersName = "servers.json";
const BotInfoName = "bot.json";

export class DataController
{
    /** @type {Object<string, Work[]>} */
    _users
    /** @type {Object<string, Server>} */
    _servers
    /** @type {BotInfo} */
    _botInfos

    constructor()
    {
        this._servers = {};
        this._users = {};
        this._botInfos = new BotInfo();

        // Load data from file
        this._users = LoadFile(DataPath + UsersName) || {};
        this._servers = LoadFile(DataPath + ServersName) || {};
        this._botInfos = LoadFile(DataPath + BotInfoName) || this._botInfos;

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

        // Convert data to BotInfo objects
        this._botInfos = new BotInfo().FromJson(this._botInfos);

        // Check if the users have works in projects he's in
        for (const serverId in this._servers)
        {
            const server = this._servers[serverId];
            const projects = server.Projects;

            for (const projectId in projects)
            {
                const project = projects[projectId];

                for (const role of project.Roles)
                {
                    for (const userId of role.Users)
                    {
                        if (this._users[userId] === undefined)
                        {
                            this._users[userId] = [];
                        }

                        // Add the work if it doesn't exist
                        if (!this._users[userId].some(work => work.ProjectId === projectId && work.ServerId === serverId))
                        {
                            this._users[userId].push(new Work().FromJson({ProjectId: projectId, ServerId: serverId}));
                        }
                    }
                }
            }
        }
    }

    SaveAll()
    {
        SaveJsonToFile(DataPath + UsersName, this._users);
        SaveJsonToFile(DataPath + ServersName, this._servers);
        SaveJsonToFile(DataPath + BotInfoName, this._botInfos);

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
        SaveJsonToFile(`${path}/${BotInfoName}`, this._botInfos);

        Logger.Log("Backed up all data");
    }

    /**
     * @brief Initialize the user and server where the interaction was made if they don't exist.
     * @param interaction {CommandInteraction}
     */
    InitData(interaction)
    {
        if (interaction.guildId)
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

    // Stats functions

    DailyCheck(force = false)
    {
        const now = new Date();

        for (const serverId in this._servers)
        {
            const server = this._servers[serverId];

            // Check inactivity for projects
            for (let projectId in server.Projects)
            {
                const project = server.Projects[projectId];
                const lastActionDate = new Date(project.LastActionDate);
                const difference = now - lastActionDate;
                const days = difference / (1000 * 60 * 60 * 24);

                if (days > 7 && !project.InactivityNotified)
                {
                    project.InactivityNotified = true;
                    const embed = EmbedUtility.GetWarningEmbedMessage(`Project **${project.Title}** is inactive`,
                        `Last action: ${time(lastActionDate, "R")}`);

                    if (project.ImageLink.startsWith("http")) embed.setImage(project.ImageLink);

                    this.SendMessage({guildId: serverId}, projectId, project.ProjectManagers, embed);
                }
            }

            if (!server.Stats.Enabled[StatsType.ChapterDone]) continue;

            const lastUpdate = server.Stats.ChapterDoneTimeLastUpdate;
            const week = 24 * 60 * 60 * 1000 * 7;
            const month = 24 * 60 * 60 * 1000 * 30;

            if (!force)
            {
                if (server.Stats.ChapterDoneTimeType === TimeType.Weekly && now - lastUpdate < week) continue;
                if (server.Stats.ChapterDoneTimeType === TimeType.Monthly && now - lastUpdate < month) continue;
                if (server.Stats.ChannelId === "") continue;
            }

            const channel = ScanProjectManager.Instance.DiscordClient.channels.cache.get(server.Stats.ChannelId);

            if (!channel) continue;

            const embed = EmbedUtility.GetNeutralEmbedMessage(`${TimeTypeToString(server.Stats.ChapterDoneTimeType)} stats`);
            const fields = [];

            // Transform the data to an array format
            const formattedData = [];

            for (const userId in server.Stats.ChapterDoneTimeSpecific)
            {
                const chapterDone = server.Stats.ChapterDoneTimeSpecific[userId];

                formattedData.push({userId: userId, chapterDone: chapterDone});
            }

            // Sort the array
            formattedData.sort((a, b) => b.chapterDone - a.chapterDone);

            // Add the fields
            for (const data of formattedData)
            {
                fields.push(`<@${data.userId}>: ${data.chapterDone} chapter${data.chapterDone > 1 ? "s" : ""}`);

                if (fields.length === 30) break;
            }

            if (fields.length > 0)
            {
                embed.addFields({name: "Top chapter done", value: fields.join("\n")});
            }
            else
            {
                embed.setDescription("No data available");
            }

            try
            {
                channel.send(EmbedUtility.FormatMessageContent(embed));
            }
            catch (error) {}

            server.Stats.ChapterDoneTimeLastUpdate = now;
            server.Stats.ChapterDoneTimeSpecific = {};
        }
    }

    // Information functions

    GetChangelogsNewer()
    {
        // Get the changelogs in reverse order
        return this._botInfos.Changelogs.slice().reverse();
    }

    AddChangelog(changelog)
    {
        this._botInfos.Changelogs.push(changelog);

        const embed = EmbedUtility.FormatMessageContent(EmbedUtility.GetNeutralEmbedMessage(`Changelog v${changelog.Version}`, changelog.Changes));

        for (const serverId in this._servers)
        {
            // Then, publish it
            const server = this._servers[serverId];

            if (server.BotInformationChannelId === "") continue;

            const channel = ScanProjectManager.Instance.DiscordClient.channels.cache.get(server.BotInformationChannelId);

            if (!channel) continue;

            try
            {
                channel.send(embed);
            }
            catch (error) {}
        }
    }

    GetFaqs()
    {
        return this._botInfos.Faqs;
    }

    AddFaq(faq)
    {
        this._botInfos.Faqs.push(faq);
    }

    DeleteFaq(index)
    {
        this._botInfos.Faqs.splice(index, 1);
    }

    /**
     * @brief Delete the server from the data, delete from users the work related to the server.
     * @param serverId {string} The id of the server to delete.
     */
    DeleteServerData(serverId)
    {
        // First, go through all the users and delete the work related to the server
        for (const userId in this._users)
        {
            const works = this._users[userId];

            for (let i = 0; i < works.length; i++)
            {
                if (works[i].ServerId === serverId)
                {
                    works.splice(i, 1);
                }
            }
        }

        // Then, delete the server
        delete this._servers[serverId];
    }

    /**
     * @brief Get all guilds where the bot is.
     * @return {Guild[]} The guilds where the bot is.
     */
    GetAllGuilds()
    {
        const servers = [];

        for (const serverId in this._servers)
        {
            let server = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(serverId);

            if (!server) continue;

            servers.push(server);
        }

        return servers;
    }

    async FetchGuilds()
    {
        for (const serverId in this._servers)
        {
            let server = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(serverId);

            if (!server)
            {
                try
                {
                    await ScanProjectManager.Instance.DiscordClient.guilds.fetch(serverId);
                }
                catch (error) {}
            }
        }
    }

    GetServers()
    {
        return this._servers;
    }

    GetServerStats(serverId)
    {
        if (this._servers[serverId] === undefined) return undefined;

        return this._servers[serverId].Stats;
    }

    GetServer(serverId)
    {
        if (this._servers[serverId] === undefined) return undefined;

        return this._servers[serverId];
    }

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

    GetProjectsFromChannel(interaction)
    {
        if (this._servers[interaction.guildId] === undefined) return undefined;

        const projects = this._servers[interaction.guildId].Projects;
        const result = [];

        for (const projectId in projects)
        {
            if (projects[projectId].ChannelId !== interaction.channelId) continue;

            result.push(projects[projectId]);
        }

        return result;
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
     * @param settings {{serverID: string | null, userID: string, projectManagerID: string | null}}
     * @returns {{serverId: string, project: Project, tasks: {task: Task, roleAvailable: number[]}[]}[]}
     * @constructor
     */
    GetProjectWithTasks(settings)
    {
        const projects = [];
        const userId = settings.userID;

        if (this._users[userId] === undefined) return projects;

        for (const work of this._users[userId])
        {
            if (settings.serverID !== null && work.ServerId !== settings.serverID) continue;

            const project = this.GetProject({guildId: work.ServerId}, work.ProjectId);
            const tasks = [];

            if (project === undefined) continue;

            if (settings.projectManagerID !== null && !project.ProjectManagers.includes(settings.projectManagerID)) continue;

            for (const task of project.Tasks)
            {
                if (task.IsAllCompleted() && project.ProjectManagers.includes(userId))
                {
                    tasks.push({task: task, roleAvailable: [project.Roles.length]});
                    continue;
                }

                /** @type {Object<number, number>} */
                const movingRole = {};
                let index = 0;
                const roles = [];

                for (const role of project.Roles)
                {
                    const isRoleDone = task.Completion[index];

                    if (role.Moving !== -1 && !isRoleDone)
                    {
                        movingRole[index] = role.Moving;
                    }

                    if (role.Users.includes(userId) && !isRoleDone)
                    {
                        roles.push(index);
                    }

                    // Check if we should break the loop
                    if (!isRoleDone && movingRole[index] === undefined) break;
                    if (index !== 0)
                    {
                        let shouldBreak = false;

                        for (let i = index; i > 0; i--)
                        {
                            if (movingRole[i] === undefined) continue;

                            if (!task.Completion[i] && index === movingRole[i]) {
                                shouldBreak = true;
                                break;
                            }
                        }

                        if (shouldBreak) break;
                    }

                    index++;
                }

                if (roles.length === 0) continue;

                tasks.push({task: task, roleAvailable: roles});
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
            const task = new Task().FromJson({Name: chapter.toString(), Completion: []});

            task.InitializeCompletion(project.Roles);
            project.Tasks.push(task);
            tasks.push(task);
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
     * @param serverId
     * @param projectId
     * @param work {{chapters: number[] | string[], role: number}}
     * @constructor
     * @returns {number} The number of tasks done
     */
    DoneChapters(serverId, projectId, work)
    {
        const server = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(serverId);
        const fakeInteraction = {guild: server, guildId: serverId};
        const project = this.GetProject(fakeInteraction, projectId);

        if (project === undefined) return;

        const doneTasks = [];
        const updatedTasks = [];
        let tasksDone = 0;

        for (const chapter of work.chapters)
        {
            const index = project.Tasks.findIndex(task => task.Name === chapter.toString());

            if (index !== -1)
            {
                if (project.Tasks[index].Completion.length === work.role && project.Tasks[index].IsAllCompleted())
                {
                    const lastTask = project.Tasks.splice(index, 1);

                    project.LastTaskDone = lastTask[0].Name;

                    continue;
                }

                if (!project.Tasks[index].Completion[work.role])
                {
                    tasksDone++;
                    project.Tasks[index].Completion[work.role] = true;
                }


                if (project.Tasks[index].IsAllCompleted())
                {
                    doneTasks.push(project.Tasks[index]);
                }
                else
                {
                    updatedTasks.push(project.Tasks[index]);

                    if (project.AutoTask && index === project.Tasks.length - 1)
                    {
                        const task = new Task().FromJson({Name: (parseFloat(project.Tasks[index].Name) + 1).toString()});

                        task.InitializeCompletion(project.Roles);
                        project.Tasks.push(task);
                        updatedTasks.push(task);
                    }
                }
            }
        }

        if (doneTasks.length > 0 || updatedTasks.length > 0)
        {
            project.UpdateLastActionDate();
        }

        this.NotifyTasksDone(fakeInteraction, projectId, doneTasks);
        this.NotifyTasksUpdate(fakeInteraction, projectId, updatedTasks);

        return tasksDone;
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

                // Add the work if it doesn't exist
                if (this._users[userId] === undefined) this._users[userId] = [];

                if (!this._users[userId].some(work => work.ProjectId === editedProject.Id && work.ServerId === interaction.guildId))
                {
                    this._users[userId].push(new Work().FromJson({ProjectId: editedProject.Id, ServerId: interaction.guildId}));
                }
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

        for (const role of project.Roles)
        {
            const users = [];

            // Just notify the users of the first role that they can start working on the new tasks
            for (const userId of role.Users)
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

            embed.setDescription(`You can start working on ${message} (${role.Name})`);
            embed.setFooter({text: `Use /tasks to see your new tasks`});

            this.SendMessage(interaction, projectId, users, embed);

            if (role.Moving === -1) break;
        }
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
            const roles = [];
            /** @type {Object<number, number>} */
            const movingRole = {};
            let index = 0;

            for (const role of project.Roles)
            {
                if (role.Moving !== -1 && !task.Completion[index])
                {
                    movingRole[index] = role.Moving;
                }

                if (!task.Completion[index])
                {
                    roles.push(role.Name);
                }

                // Check if we should break the loop
                if (!task.Completion[index] && movingRole[index] === undefined) break;
                if (index !== 0)
                {
                    let shouldBreak = false;

                    for (let i = index; i > 0; i--)
                    {
                        if (movingRole[i] === undefined) continue;

                        if (!task.Completion[i] && index === movingRole[i])
                        {
                            shouldBreak = true;
                            break;
                        }
                    }

                    if (shouldBreak) break;
                }

                index++;
            }

            // Notify all users that should finish their tasks that's a moving role and all
            for (const role of roles)
            {
                for (const userId of project.Roles.find(r => r.Name === role).Users)
                {
                    if (usersAssignments[userId] === undefined) usersAssignments[userId] = {};
                    if (usersAssignments[userId][role] === undefined) usersAssignments[userId][role] = [];

                    usersAssignments[userId][role].push(task.Name);
                }
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
            const chapters = usersAssignments[roles[role][0]][role];
            let message = `- **${role}**: chapter${chapters.length > 1 ? "s" : ""} ${chapters[0]}${chapters.length > 1 ? " to " + chapters[chapters.length - 1] : ""}`;
            let title = `New task${tasks.length > 1 ? "s" : ""} available in project **${project.Title}**`;

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

        let message = `- Chapter${tasks.length > 1 ? "s" : ""} ${tasks[0].Name}${tasks.length > 1 ? " to " + tasks[tasks.length - 1].Name : ""}`;
        let title = `Chapter${tasks.length > 1 ? "s" : ""} ready to be published`;

        if (project.Notify === NotifyType.dm)
        {
            title += ` in project **${project.Title}** on server **${interaction.guild.name}**`;
        }

        const embed = EmbedUtility.GetGoodEmbedMessage(title, `The following chapters are done and ready to be published:\n${message}`);

        if (project.ImageLink.startsWith("http"))
        {
            embed.setImage(project.ImageLink);
        }

        embed.setFooter({text: `Use /tasks to see your new tasks`});

        this.SendMessage(interaction, projectId, project.ProjectManagers, embed);
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







































