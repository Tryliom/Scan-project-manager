import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/BaseCommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import {ProjectEditor} from "../../menus/interfaces/ProjectEditor.mjs";
import {Project} from "../../data/Project.mjs";
import {ConfirmationInterface} from "../../menus/interfaces/ConfirmationInterface.mjs";
import {DiscordUtility} from "../../utility/DiscordUtility.mjs";

export class Projects extends Command
{
    constructor()
    {
        super("projects", "", 0, "Manage projects.",
            "List, create, edit and delete projects. There is a guide to use it in /faq.");

        this.SetOnlyInServer();
    }

    async Run(interaction)
    {
        // Check if the user is in a project if server visibility is set to team only
        const server = ScanProjectManager.Instance.DataCenter.GetServer(interaction.guildId);
        const userID = interaction.user.id;
        const isAdmin = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(interaction.guildId).members.cache.get(userID).permissions.has("Administrator");

        if (!server.Visibility && !isAdmin)
        {
            const projects = ScanProjectManager.Instance.DataCenter.GetProjects(interaction);

            if (Object.keys(projects).length === 0)
            {
                await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("There are no projects in this server."), true);
                return;
            }

            for (let projectId in projects)
            {
                /** @type {Project} */
                const project = projects[projectId];

                if (project.Roles.filter(role => role.Users.includes(userID)).length > 0 || project.ProjectManagers.includes(userID))
                {
                    await new ProjectManager(interaction, true).Start();
                    return;
                }
            }

            await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You are not part of any project in this server."), true);
        }
        else
        {
            await new ProjectManager(interaction, isAdmin).Start();
        }
    }
}

const Menu =
{
    Home: 0,
    List: 1,
}

class ProjectManager extends CommandInterface
{
    /** @type {Menu} */
    _menu = Menu.Home;
    /** @type {number} */
    page = 0;
    /** @type {boolean} */
    _canEdit = true;

    constructor(interaction, canEdit = true)
    {
        super(interaction);

        this._canEdit = canEdit;

        this.SetMenuList([
            {
                onMenuClick: values => this.page = parseInt(values[0]),
                getList: () =>
                {
                    const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
                    const list = [];

                    for (let projectId in projects)
                    {
                        const project = projects[projectId];
                        const index = Object.keys(projects).indexOf(projectId);
                        const option = {label: project.Title, description: project.Description, value: index};

                        if (index === this.page) option.default = true;

                        list.push(option);
                    }

                    return list;
                },
                options: {label: item => item.label, description: item => item.description, value: item => item.value, default: item => item.default || false},
                placeholder: "Select project.."
            }
        ]);
    }

    ConstructEmbed()
    {
        if (this._menu === Menu.Home) return this.GetHomeEmbed();
        if (this._menu === Menu.List) return this.GetListEmbed();

        return super.ConstructEmbed();
    }

    ConstructComponents()
    {
        if (this._menu === Menu.Home) return this.GetHomeComponents();
        if (this._menu === Menu.List) return this.GetListComponents();

        return super.ConstructComponents();
    }

    async OnButton(interaction)
    {
        switch (this._menu)
        {
            case Menu.Home: await this.OnButtonHome(interaction); break;
            case Menu.List: await this.OnButtonList(interaction); break;
        }
    }

    // Home

    GetHomeEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Project Manager");
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);

        embed.setDescription(`You have ${Object.keys(projects).length} projects.`);

        embed.addFields([
            {name: `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.List)}  List`, value: "List all your projects to edit them."},
            {name: `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Add)}  Create`, value: "Create a new project."}
        ]);

        return embed;
    }

    GetHomeComponents()
    {
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`projects_list`)
                    .setLabel("List")
                    .setDisabled(Object.keys(projects).length === 0)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.List)),
                new ButtonBuilder()
                    .setCustomId(`projects_create`)
                    .setLabel("Create")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Add))
                    .setDisabled(!this._canEdit)
            )
        );
        components.push(this.GetCloseButton());

        return components;
    }

    async OnButtonHome(interaction)
    {
        if (interaction.customId === "projects_create")
        {
            this.IgnoreInteractions = true;

            const newProject = new Project();

            newProject.ChannelId = interaction.channelId;

            await new ProjectEditor(this.Interaction, interaction, newProject, (project, lastInteraction) =>
                {
                    if (project)
                    {
                        ScanProjectManager.Instance.DataCenter.AddProject(this.Interaction, project);
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();

                    if (project)
                    {
                        ScanProjectManager.Instance.DataCenter.NotifyNewProject(this.Interaction, project.Id);
                    }
                }
            ).Start();
        }
        else if (interaction.customId === "projects_list")
        {
            this._menu = Menu.List;
            this.page = 0;
        }
    }

    // List

    GetListEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Project Manager - List");
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
        /** @type {number} */
        const projectLength = Object.keys(projects).length;

        if (projectLength === 0) return embed.setDescription("You have no projects.");

        /** @type {Project} */
        const project = projects[Object.keys(projects)[this.page]];

        project.AddToEmbed(embed, true);

        embed.setFooter({text: `Page ${this.page + 1}/${projectLength}`});

        return embed;
    }

    GetListComponents()
    {
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
        const projectLength = Object.keys(projects).length;
        const components = [];

        if (projectLength !== 0)
        {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`projects_edit`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "✏️"})
                        .setDisabled(!this._canEdit),
                    new ButtonBuilder()
                        .setCustomId(`projects_delete`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
                        .setDisabled(!this._canEdit),
                    new ButtonBuilder()
                        .setCustomId(`refresh`)
                        .setEmoji({name: "🔄"})
                        .setStyle(ButtonStyle.Secondary)
                )
            );
        }

        if (projectLength > 1)
        {
            this.AddMenuComponents(components, 0);
            components.push(this.GetChangePageButtons());
        }

        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`return`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return))
        ));

        return components;
    }

    async OnButtonList(interaction)
    {
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);

        this.OnButtonChangePage(interaction, Object.keys(projects).length, 0);

        if (interaction.customId === "return")
        {
            this._menu = Menu.Home;
        }
        else if (interaction.customId === "projects_edit")
        {
            this.IgnoreInteractions = true;

            await new ProjectEditor(this.Interaction, interaction, projects[Object.keys(projects)[this.page]], (project, lastInteraction) =>
                {
                    if (project)
                    {
                        ScanProjectManager.Instance.DataCenter.NotifyProjectUpdate(this.Interaction, projects[Object.keys(projects)[this.page]], project);

                        projects[Object.keys(projects)[this.page]] = project;
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();
                }
            ).Start();
        }
        else if (interaction.customId === "projects_delete")
        {
            this.IgnoreInteractions = true;

            await new ConfirmationInterface(this.Interaction, interaction, "Are you sure you want to delete this project ?", (response, lastInteraction) =>
                {
                    if (response)
                    {
                        ScanProjectManager.Instance.DataCenter.NotifyProjectDeletion(this.Interaction, projects[Object.keys(projects)[this.page]]);

                        delete projects[Object.keys(projects)[this.page]];
                        this.page = 0;
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();
                }
            ).Start();
        }
    }
}