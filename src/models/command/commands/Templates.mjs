import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import {TemplateEditor} from "../../menus/interfaces/TemplateEditor.mjs";
import {Template} from "../../data/Template.mjs";

export class Templates extends Command
{
    constructor()
    {
        super("templates", "", 0, "Manage templates.");

        this.SetOnlyInServer();
        this.SetAdmin();
    }

    async Run(interaction)
    {
        await new TemplateManager(interaction).Start();
    }
}

const Menu =
{
    Home: 0,
    List: 1,
}

class TemplateManager extends CommandInterface
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
                onMenuClick: value => this.page = parseInt(value),
                getList: () =>
                {
                    const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);
                    const list = [];

                    for (let template of templates)
                    {
                        const index = templates.indexOf(template);
                        const option = {label: template.Name, description: template.Description, value: index};

                        if (index === this.page) option.default = true;

                        list.push(option);
                    }

                    return list;
                },
                options: {label: item => item.label, description: item => item.description, value: item => item.value, default: item => item.default || false},
                placeholder: "Select template.."
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
        const embed = EmbedUtility.GetNeutralEmbedMessage("Template Manager");
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);

        embed.setDescription(`You have ${templates.length} templates.`);

        embed.addFields([
            {name: `ℹ️  Info`, value: "Templates are used to create projects. They contain the role names and people assigned to them. Usually used for different teams."},
            {name: '\u200b', value: '\u200b'},
            {name: `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.List)}  List`, value: "List all your templates to edit them."},
            {name: `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Add)}  Create`, value: "Create a new template."},
            {name: `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Import)}  Import`, value: "Import a template from your projects."}
        ]);

        return embed;
    }

    GetHomeComponents()
    {
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);
        const projects = ScanProjectManager.Instance.DataCenter.GetProjects(this.Interaction);
        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`templates_list`)
                    .setLabel("List")
                    .setDisabled(templates.length === 0)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.List)),
                new ButtonBuilder()
                    .setCustomId(`templates_create`)
                    .setLabel("Create")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Add)),
                new ButtonBuilder()
                    .setCustomId(`templates_import`)
                    .setLabel("Import")
                    .setDisabled(Object.keys(projects).length === 0)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Import))
            )
        );
        components.push(this.GetCloseButton());

        return components;
    }

    async OnButtonHome(interaction)
    {
        if (interaction.customId === "templates_create")
        {
            this.IgnoreInteractions = true;

            await new TemplateEditor(this.Interaction, interaction, new Template(), (template, lastInteraction) =>
                {
                    if (template)
                    {
                        ScanProjectManager.Instance.DataCenter.AddTemplate(this.Interaction, template);
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();
                }
            ).Start();
        }
        else if (interaction.customId === "templates_list")
        {
            this._menu = Menu.List;
            this.page = 0;
        }
    }

    // List

    GetListEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Template Manager - List");
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);

        if (templates.length === 0) return embed.setDescription("You have no templates.");

        const template = templates[this.page];

        embed.addFields([
            {name: template.Name, value: template.Description},
            template.GetSectionsAsFields()
        ]);

        embed.setFooter({text: `Page ${this.page + 1}/${templates.length}`});

        return embed;
    }

    GetListComponents()
    {
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);
        const components = [];

        if (templates.length !== 0)
        {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`templates_edit`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "✏️"}),
                    new ButtonBuilder()
                        .setCustomId(`templates_delete`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
                )
            );
        }

        if (templates.length > 1)
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
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);

        this.OnButtonChangePage(interaction, templates.length, 0);

        if (interaction.customId === "return")
        {
            this._menu = Menu.Home;
        }
        else if (interaction.customId === "templates_edit")
        {
            this.IgnoreInteractions = true;

            await new TemplateEditor(this.Interaction, interaction, templates[this.page], (template, lastInteraction) =>
                {
                    if (template)
                    {
                        templates[this.page] = template;
                    }

                    this.IgnoreInteractions = false;
                    this.LastInteraction = lastInteraction;
                    this.UpdateMsg();
                }
            ).Start();
        }
        else if (interaction.customId === "templates_delete")
        {
            templates.splice(this.page, 1);
            this.page = 0;
        }
    }
}