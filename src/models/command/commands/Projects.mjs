import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import {TemplateEditor} from "../../menus/interfaces/TemplateEditor.mjs";
import {Template} from "../../data/Template.mjs";
import {ProjectEditor} from "../../menus/interfaces/ProjectEditor.mjs";
import {Project} from "../../data/Project.mjs";

export class Projects extends Command
{
    constructor()
    {
        super("projects", "", 0, "Manage projects.");

        this.SetOnlyInServer();
        this.SetAdmin();
    }

    async Run(interaction)
    {
        await new ProjectManager(interaction).Start();
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

    constructor(interaction)
    {
        super(interaction);

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
                        const option = {label: project.Name, description: project.Description, value: index};

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

        project.AddToEmbed(embed);

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
                        .setEmoji({name: "✏️"}),
                    new ButtonBuilder()
                        .setCustomId(`projects_delete`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
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
            delete projects[Object.keys(projects)[this.page]];
            this.page = 0;
        }
    }
}