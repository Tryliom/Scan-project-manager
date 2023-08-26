import {ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

import {CommandInterface} from "../CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {Template} from "../../data/Template.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {NotifyType, Project} from "../../data/Project.mjs";
import {TemplateEditor} from "./TemplateEditor.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";

const Menu =
{
    Editor: 0,
    Info: 1,
};

export class ProjectEditor extends CommandInterface
{
    /** @type {Project} */
    _project
    /** @type {Project[]} */
    _undoStack = []
    /** @type {function (project: Project, lastInteraction: CommandInteraction)} */
    _onConfirm

    /** @type {Menu} */
    _menu = Menu.Editor

    /**
     *
     * @param interaction
     * @param lastInteraction
     * @param project {Project}
     * @param onConfirm {function (project: Project, lastInteraction: CommandInteraction)}
     */
    constructor(interaction, lastInteraction, project, onConfirm)
    {
        super(interaction);

        this.SetLastInteraction(lastInteraction);
        this.SetMenuList([
            // Users list
            {
                onMenuClick: values =>
                {
                    // Remove all users from the project managers
                    this._project.ProjectManagers = [];

                    // Add the selected users to the section
                    for (let value of values)
                    {
                        this._project.ProjectManagers.push(value);
                    }

                    this.SaveOldState();
                },
                placeholder: "Select project manager..",
                maxValues: 5,
                minValues: 1,
                menuType: CommandInterface.MenuType.User
            },
            // Channel list
            {
                onMenuClick: values =>
                {
                    this._project.ChannelId = values[0];

                    this.SaveOldState();
                },
                placeholder: "Select channel..",
                menuType: CommandInterface.MenuType.Channel
            },
            // Roles import from templates or another project
            {
                onMenuClick: values =>
                {
                    const value = values[0];

                    if (value === "template_none" || value === "project_none") return;

                    if (value.startsWith("template_"))
                    {
                        const template = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction)[parseInt(value.replace("template_", ""))];

                        if (template)
                        {
                            this._project.Roles = template.Roles;
                        }
                    }
                    else if (value.startsWith("project_"))
                    {
                        const project = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction)[value.replace("project_", "")];

                        if (project)
                        {
                            this._project.Roles = project.Roles;
                        }
                    }

                    this.SaveOldState();
                },
                getList: () =>
                {
                    const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);
                    const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
                    const list = [];

                    if (templates.length > 0)
                    {
                        list.push({label: "Templates", description: "Import roles from a template", value: "template_none", default: true});

                        for (let i = 0; i < templates.length; i++)
                        {
                            list.push({label: templates[i].Name, description: templates[i].Description, value: `template_${i}`});
                        }
                    }

                    if (Object.keys(projects).length > 0)
                    {
                        list.push({label: "Projects", description: "Import roles from a project", value: "project_none", default: true});

                        let i = 0;
                        for (let projectId in projects)
                        {
                            const project = projects[projectId];

                            list.push({label: project.Title, description: project.Description, value: `project_${projectId}`});
                            i++;
                        }
                    }

                    return list;
                },
                options: {label: item => item.label, description: item => item.description, value: item => item.value},
                placeholder: "Import roles from..",
                menuType: CommandInterface.MenuType.String,
            }
        ]);

        // Make a copy of the template
        this._project = new Project().FromJson(project);
        this._onConfirm = onConfirm;
        this.SaveOldState();
    }

    ConstructEmbed()
    {
        if (this._menu === Menu.Info)
        {
            const embed = EmbedUtility.GetNeutralEmbedMessage("Help about project editor");

            embed.addFields([
                {name: "Project", value: "It's a manga/manhwa/manhua scanlation project. It can be a one-shot, a series or a collection of one-shots."},
                {name: "Image link (optional)", value: "Link to the image of the project. It can be a cover or a logo. It's just used to make the project more recognizable."},
                {name: "Links (optional)", value: "Links used in the project for resources."},
                {name: "Roles", value: "Roles are the different roles of people working on the project. They can be the translator, the cleaner, etc."},
                {name: "Project managers", value: "Project managers are the people in charge of the project. They will be notified when a chapter is done or if a task is inactive for more than 1 week."},
                {name: "Channel", value: "Channel where the notifications will be sent. If not, notifications will be sent in private message."},
                {name: "Notify", value: "Notify type is the type of notification that will be sent. It can be in the channel or in private message."},
                {name: "Chapter auto creation", value: "If enabled, a new chapter will be created automatically when the last one is done. It will be named \"Chapter X\" where X is the number of the chapter and increase by 1 each time."},
            ]);

            return embed;
        }

        const embed = EmbedUtility.GetNeutralEmbedMessage("Project Editor");

        this._project.AddToEmbed(embed);

        return embed;
    }

    ConstructComponents()
    {
        if (this._menu === Menu.Info)
        {
            return [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`return`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return))
                )
            ];
        }

        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`string_edit`)
                    .setLabel("Edit info")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"}),
                new ButtonBuilder()
                    .setCustomId(`role_edit`)
                    .setLabel("Edit roles")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"}),
                new ButtonBuilder()
                    .setCustomId(`notify_type`)
                    .setLabel("Notify type")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "🔄"}),
                new ButtonBuilder()
                    .setCustomId(`chapter_auto_creation`)
                    .setLabel("Chapter auto creation")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "🔄"}),
                new ButtonBuilder()
                    .setCustomId(`undo`)
                    .setLabel("Undo")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "↩️"})
                    .setDisabled(this._undoStack.length < 2)
            )
        );

        this.AddMenuComponents(components, 0);
        this.AddMenuComponents(components, 1);

        if (templates.length > 0 || Object.keys(projects).length > 0)
        {
            this.AddMenuComponents(components, 2);
        }

        components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`return`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                new ButtonBuilder()
                    .setCustomId(`confirm`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji({name: "💾"}),
                new ButtonBuilder()
                    .setCustomId(`info`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "ℹ️"})
            )
        );

        return components;
    }

    async OnButton(interaction)
    {
        if (this._menu === Menu.Info && interaction.customId === "return")
        {
            this._menu = Menu.Editor;

            return;
        }

        if (interaction.customId === "confirm" || interaction.customId === "return")
        {
            const project = interaction.customId === "return" ? null : this._project;
            await this.StopCollector(false);
            await this._onConfirm(project, this.LastInteraction);
        }
        else if (interaction.customId === "info")
        {
            this._menu = Menu.Info;
        }

        if (interaction.customId === "string_edit")
        {
            const modal = new ModalBuilder()
                .setCustomId("string_edit")
                .setTitle("Fields edition")

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('title')
                        .setLabel("Title")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Name of the project")
                        .setMinLength(1)
                        .setMaxLength(150)
                        .setValue(this._project.Title)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel("Description")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Project description")
                        .setMinLength(1)
                        .setMaxLength(3999)
                        .setValue(this._project.Description)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('image_link')
                        .setLabel("Image")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Link to the image if you have one")
                        .setMinLength(1)
                        .setMaxLength(150)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('links')
                        .setLabel("Links")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Project links")
                        .setMinLength(1)
                        .setMaxLength(3999)
                        .setRequired(false)
                )
            );

            if (this._project.ImageLink !== "")
            {
                modal.components[2].components[0].setValue(this._project.ImageLink);
            }

            if (this._project.Links !== "")
            {
                modal.components[3].components[0].setValue(this._project.Links);
            }

            await this.ShowModal(modal);
        }
        else if (interaction.customId === "role_edit")
        {
            // Open the role editor
            this.IgnoreInteractions = true;

            await new TemplateEditor(this.Interaction, interaction, new Template().FromJson({Name: "none", Description: "none", Roles: this._project.Roles}),
                (template, lastInteraction) =>
                {
                    if (template)
                    {
                        this._project.Roles = template.Roles;
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();
                },
                true
            ).Start();
        }
        else if (interaction.customId === "undo")
        {
            this.RestoreOldState();
        }

        if (interaction.customId === "notify_type")
        {
            this._project.Notify = this._project.Notify === NotifyType.channel ? NotifyType.dm : NotifyType.channel;
        }
        else if (interaction.customId === "chapter_auto_creation")
        {
            this._project.AutoTask = !this._project.AutoTask;
        }

        this.SaveOldState();
    }

    async OnModal(interaction)
    {
        if (interaction.customId === "string_edit")
        {
            const title = interaction.fields.getTextInputValue('title');
            const description = interaction.fields.getTextInputValue('description');
            const imageLink = interaction.fields.getTextInputValue('image_link');
            const links = interaction.fields.getTextInputValue('links');

            this._project.Title = title;
            this._project.Description = description;
            this._project.ImageLink = imageLink;
            this._project.Links = links;
        }

        this.SaveOldState();
    }

    SaveOldState()
    {
        // Check if the last state is the same as the current one
        if (this._undoStack.length > 0 && JSON.stringify(this._undoStack[this._undoStack.length - 1]) === JSON.stringify(this._project)) return;

        if (this._undoStack.length >= 100)
        {
            this._undoStack.shift();
        }

        this._undoStack.push(new Project().FromJson(this._project));
    }

    RestoreOldState()
    {
        if (this._undoStack.length > 0)
        {
            do {
                let lastState = this._undoStack.pop();

                if (JSON.stringify(lastState) !== JSON.stringify(this._project))
                {
                    this._project = lastState;
                    break;
                }
            } while (this._undoStack.length > 0);
        }
    }
}