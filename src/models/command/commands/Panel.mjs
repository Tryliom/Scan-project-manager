import {Command} from "../Command.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, time} from "discord.js";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {exec} from "child_process";
import {Changelog} from "../../data/Changelog.mjs";
import {DiscordUtility} from "../../utility/DiscordUtility.mjs";

export class Panel extends Command
{
    constructor()
    {
        super("panel", "", 0, "Show a panel to restart and update the bot");

        this.SetOnlyCreator();
    }

    async Run(interaction)
    {
        await new PanelInterface(interaction).Start();
    }
}

class PanelInterface extends CommandInterface
{
    /** @type {boolean} */
    _servers = false
    /** @type {boolean} */
    _updated = false
    /** @type {number} */
    page = 0;
    /** @type {boolean} */
    _preloaded = false

    constructor(interaction)
    {
        super(interaction);

        this.SetEphemeral(true);
        this.SetMenuList([
            {
                onMenuClick: values => this.page = parseInt(values[0]),
                getList: () =>
                {
                    /** @type {Guild[]} */
                    const guilds = ScanProjectManager.Instance.DataCenter.GetAllGuilds();
                    const list = [];

                    for (let guild of guilds)
                    {
                        const index = guilds.indexOf(guild);
                        const option = {label: guild.name, description: guild.id, value: index};

                        if (index === this.page) option.default = true;

                        list.push(option);
                    }

                    return list;
                },
                options: {label: item => item.label, description: item => item.description, value: item => item.value, default: item => item.default || false},
                placeholder: "Select server.."
            }
        ]);
    }

    async OnAction()
    {

        if (!this._preloaded) await ScanProjectManager.Instance.DataCenter.FetchGuilds();
        const servers = ScanProjectManager.Instance.DataCenter.GetAllGuilds();

        for (let guild of servers)
        {
            if (!guild.ownerId) continue;

            // Preload owners
            await ScanProjectManager.Instance.DiscordClient.users.fetch(guild.ownerId);
        }
    }

    ConstructEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Creator panel");

        if (this._servers)
        {
            const servers = ScanProjectManager.Instance.DataCenter.GetAllGuilds();

            if (servers.length === 0)
            {
                embed.setDescription("There are no servers available.");
                return embed;
            }

            /** @type {Guild} */
            const server = servers[this.page];
            const owner = ScanProjectManager.Instance.DiscordClient.users.cache.get(server.ownerId);
            const serverData = ScanProjectManager.Instance.DataCenter.GetServer(server.id);

            embed.setDescription(`**${server.name}** (${server.id})`);
            embed.addFields([
                {name: "Members", value: `${server.memberCount} members`, inline: true},
                {name: "Owner", value: owner.username, inline: true},
                {name: "\u200B", value: "\u200B"},
                {name: "Infos", value: `${serverData.Templates.length} templates\n${Object.keys(serverData.Projects).length} projects`},
            ]);
        }
        else
        {
            embed.addFields([
                {name: "Uptime", value: time(ScanProjectManager.Instance.GetUptime(), "R"), inline: true}
            ]);

            if (this._updated)
            {
                embed.addFields([
                    {name: "Updated", value: "The bot has been updated.", inline: true}
                ]);

                this._updated = false;
            }
        }

        return embed;
    }

    ConstructComponents()
    {
        const components = [];

        if (this._servers)
        {
            const servers = ScanProjectManager.Instance.DataCenter.GetAllGuilds();

            if (servers.length > 1)
            {
                this.AddMenuComponents(components, 0);
                components.push(this.GetChangePageButtons());
            }

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`return`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                    new ButtonBuilder()
                        .setCustomId(`server_quit`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
                        .setDisabled(servers.length === 0)
                )
            );
        }
        else
        {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`restart`)
                        .setLabel("Restart")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "🔄"}),
                    new ButtonBuilder()
                        .setCustomId(`update`)
                        .setLabel("Update")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "🔄"}),
                    new ButtonBuilder()
                        .setCustomId(`add_changelog`)
                        .setLabel("Add changelog")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "📝"}),
                    new ButtonBuilder()
                        .setCustomId(`servers`)
                        .setLabel("Servers")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "🌐"})
                )
            );
        }

        return components;
    }

    async OnButton(interaction)
    {
        if (this._servers)
        {
            const servers = ScanProjectManager.Instance.DataCenter.GetAllGuilds();

            if (interaction.customId === "return")
            {
                this._servers = false;
            }
            else if (interaction.customId === "server_quit")
            {
                await servers[this.page].leave();
                this.page = 0;
            }
            else
            {
                this.OnButtonChangePage(interaction, servers.length, 0);
            }
        }
        else
        {
            if (interaction.customId === "servers")
            {
                this._servers = true;
            }
            else if (interaction.customId === "restart")
            {
                await DiscordUtility.Defer(interaction);
                process.exit();
            }
            else if (interaction.customId === "update")
            {
                exec("git pull", (error, stdout1, stderr) => {
                    if (error) {
                        this.DisplayError(error);
                        return;
                    }

                    exec("npm install", (error, stdout2, stderr) => {
                        if (error) {
                            this.DisplayError(error);
                            return;
                        }

                        this.DisplayConfirmationMessage("Update finished\n\n**Git pull result**\n" + stdout1 + "\n\n**npm install result**\n" + stdout2);
                        this._updated = true;
                    });
                });
            }
            else if (interaction.customId === "add_changelog")
            {
                // Open a modal to add a changelog
                const modal = new ModalBuilder()
                    .setCustomId("changelog")
                    .setTitle("Changelog creation")

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('version')
                            .setLabel("Version")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("Just the number, like 1.0.0")
                            .setMinLength(1)
                            .setMaxLength(150)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('changes')
                            .setLabel("Changes")
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder("Changes made in this version, will be published raw")
                            .setMinLength(1)
                            .setMaxLength(3999)
                            .setRequired(true)
                    )
                );

                await this.ShowModal(modal);
            }
        }
    }

    async OnModal(interaction)
    {
        if (interaction.customId === "changelog")
        {
            const changelog = new Changelog();

            changelog.Version = interaction.fields.getTextInputValue('version');
            changelog.Changes = interaction.fields.getTextInputValue('changes');

            await ScanProjectManager.Instance.DataCenter.AddChangelog(changelog);
        }
    }
}