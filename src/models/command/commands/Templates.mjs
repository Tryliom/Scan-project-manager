import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";

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
}

class TemplateManager extends CommandInterface
{
    _menu = Menu.Home;

    constructor(interaction) {
        super(interaction);

        this.SetMenuList([]);
    }

    ConstructEmbed()
    {
        if (this._menu === Menu.Home)
        {
            return this.GetHomeEmbed();
        }

        return super.ConstructEmbed();
    }

    ConstructComponents()
    {
        if (this._menu === Menu.Home)
        {
            return this.GetHomeComponents();
        }

        return super.ConstructComponents();
    }

    // Home

    GetHomeEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Template Manager");
        const templates = ScanProjectManager.Instance.DataCenter.GetTemplates(this.Interaction);

        embed.setDescription(`You have ${templates.length} templates.`);

        embed.addFields([
            {name: `ℹ️  Info`, value: "Templates are used to create projects. They contain the role names and people assigned to them."},
            { name: '\u200b', value: '\u200b'},
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
}