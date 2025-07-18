import {Command} from "../Command.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {CommandInterface} from "../../menus/BaseCommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, time} from "discord.js";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {exec} from "child_process";
import {Changelog} from "../../data/Changelog.mjs";
import {DiscordUtility} from "../../utility/DiscordUtility.mjs";
import {Faq} from "../../data/Faq.mjs";

export class Panel extends Command
{
    constructor()
    {
        super("panel", "", 0, "Show a panel to restart and update the bot.");

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
    _faq = false
    /** @type {boolean} */
    _updated = false
    /** @type {boolean} */
    _rawServers = false
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
            },
            // List of faqs
            {
                onMenuClick: values => this.page = parseInt(values[0]),
                getList: () => ScanProjectManager.Instance.DataCenter.GetFaqs(),
                options: {
                    label: item => item.Question,
                    description: item => item.Answer,
                    value: item => ScanProjectManager.Instance.DataCenter.GetFaqs().indexOf(item),
                    default: item => ScanProjectManager.Instance.DataCenter.GetFaqs().indexOf(item) === this.page
                },
                placeholder: "Select faq.."
            },
            // List all servers without data
            {
                onMenuClick: values => this.page = parseInt(values[0]),
                getList: () =>
                {
                    const servers = ScanProjectManager.Instance.DataCenter.GetServers();
                    const keys = Object.keys(servers);
                    const list = [];

                    for (const serverID of keys)
                    {
                        const index = keys.indexOf(serverID);
                        const server = servers[serverID];
                        const option = {label: serverID, description: `${Object.keys(server.Projects).length} projects`, value: index};

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
        else if (this._faq)
        {
            // List of faqs
            const faqs = ScanProjectManager.Instance.DataCenter.GetFaqs();

            if (faqs.length === 0)
            {
                embed.setDescription("There are no faqs available.");
                return embed;
            }

            const faq = faqs[this.page];

            embed.setDescription(`**${faq.Question}**\n\n${faq.Answer}`);
        }
        else if (this._rawServers)
        {
            // List all servers without data
            const servers = ScanProjectManager.Instance.DataCenter.GetServers();
            const keys = Object.keys(servers);

            if (keys.length === 0)
            {
                embed.setDescription("There are no servers available.");
                return embed;
            }

            const liveServers = ScanProjectManager.Instance.DataCenter.GetAllGuilds();
            let serverLive = null;

            for (let server of liveServers)
            {
                if (server.id === keys[this.page])
                {
                    serverLive = server;
                    break;
                }
            }

            const server = servers[keys[this.page]];
            const projects = [];

            for (let projectID in server.Projects)
            {
                const project = server.Projects[projectID];
                projects.push(`- ${project.Title} (${projectID})`);

                if (projects.length === 10) break;
            }

            let desc = `**${keys[this.page]}** ${Object.keys(server.Projects).length} projects:\n${projects.join("\n")}`;

            if (serverLive)
            {
                desc += `\n\nKnown as **${serverLive.name}**`;
            }

            embed.setDescription(desc);
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
        else if (this._faq)
        {
            // List of faqs
            const faqs = ScanProjectManager.Instance.DataCenter.GetFaqs();

            if (faqs.length > 1)
            {
                this.AddMenuComponents(components, 1);
                components.push(this.GetChangePageButtons());
            }

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`return`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                    new ButtonBuilder()
                        .setCustomId(`faq_edit`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "✏️"})
                        .setDisabled(faqs.length === 0),
                    new ButtonBuilder()
                        .setCustomId(`faq_add`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Add)),
                    new ButtonBuilder()
                        .setCustomId(`faq_delete`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
                        .setDisabled(faqs.length === 0)
                )
            );
        }
        else if (this._rawServers)
        {
            // List all servers without data
            const servers = ScanProjectManager.Instance.DataCenter.GetServers();
            const keys = Object.keys(servers);

            if (keys.length > 1)
            {
                this.AddMenuComponents(components, 2);
                components.push(this.GetChangePageButtons());
            }

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`return`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                    new ButtonBuilder()
                        .setCustomId(`raw_server_delete`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji({name: "🗑️"})
                        .setDisabled(keys.length === 0)
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
                        .setCustomId(`faqs`)
                        .setLabel("Faqs manager")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "❓"}),
                    new ButtonBuilder()
                        .setCustomId(`servers`)
                        .setLabel("Servers")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "🌐"})
                )
            );

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`raw_servers`)
                        .setLabel("Raw servers")
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
        else if (this._faq)
        {
            // List of faqs
            const faqs = ScanProjectManager.Instance.DataCenter.GetFaqs();

            if (interaction.customId === "return")
            {
                this._faq = false;
            }
            else if (interaction.customId === "faq_edit")
            {
                // Open a modal to edit a faq
                const modal = new ModalBuilder()
                    .setCustomId("faq_edit")
                    .setTitle("Faq edition")

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('question')
                            .setLabel("Question")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("The question")
                            .setMinLength(1)
                            .setMaxLength(150)
                            .setValue(faqs[this.page].Question)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('answer')
                            .setLabel("Answer")
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder("The answer")
                            .setMinLength(1)
                            .setMaxLength(3999)
                            .setValue(faqs[this.page].Answer)
                            .setRequired(true)
                    )
                );

                await this.ShowModal(modal);
            }
            else if (interaction.customId === "faq_delete")
            {
                await ScanProjectManager.Instance.DataCenter.DeleteFaq(faqs[this.page]);
                this.page = 0;
            }
            else if (interaction.customId === "faq_add")
            {
                // Open a modal to add a faq
                const modal = new ModalBuilder()
                    .setCustomId("faq_create")
                    .setTitle("Faq creation")

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('question')
                            .setLabel("Question")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("The question")
                            .setMinLength(1)
                            .setMaxLength(150)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('answer')
                            .setLabel("Answer")
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder("The answer")
                            .setMinLength(1)
                            .setMaxLength(3999)
                            .setRequired(true)
                    )
                );

                await this.ShowModal(modal);
            }
            else
            {
                this.OnButtonChangePage(interaction, faqs.length, 1);
            }
        }
        else if (this._rawServers)
        {
            // List all servers without data
            const servers = ScanProjectManager.Instance.DataCenter.GetServers();
            const keys = Object.keys(servers);

            if (interaction.customId === "return")
            {
                this._rawServers = false;
            }
            else if (interaction.customId === "raw_server_delete")
            {
                await ScanProjectManager.Instance.DataCenter.DeleteServerData(keys[this.page]);
                this.page = 0;
            }
            else
            {
                this.OnButtonChangePage(interaction, keys.length, 2);
            }
        }
        else
        {
            if (interaction.customId === "servers")
            {
                this._servers = true;
                this.page = 0;
            }
            else if (interaction.customId === "faqs")
            {
                this._faq = true;
                this.page = 0;
            }
            else if (interaction.customId === "restart")
            {
                await DiscordUtility.Defer(interaction);
                ScanProjectManager.Instance.DataCenter.SaveAll();
                process.exit();
            }
            else if (interaction.customId === "update")
            {
                exec("git pull", async (error, stdout1, stderr) => {
                    if (error)
                    {
                        await this.DisplayError(error);
                        return;
                    }

                    exec("npm install", async (error, stdout2, stderr) => {
                        if (error)
                        {
                            await this.DisplayError(error);
                            return;
                        }

                        await this.DisplayConfirmationMessage("Update finished\n\n**Git pull result**\n" + stdout1 + "\n\n**npm install result**\n" + stdout2);
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
            else if (interaction.customId === "raw_servers")
            {
                this._rawServers = true;
                this.page = 0;
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
        else if (interaction.customId === "faq_edit")
        {
            const faqs = ScanProjectManager.Instance.DataCenter.GetFaqs();
            const faq = faqs[this.page];

            faq.Question = interaction.fields.getTextInputValue('question');
            faq.Answer = interaction.fields.getTextInputValue('answer');

            await this.UpdateMsg();
        }
        else if (interaction.customId === "faq_create")
        {
            const faq = new Faq();

            faq.Question = interaction.fields.getTextInputValue('question');
            faq.Answer = interaction.fields.getTextInputValue('answer');

            ScanProjectManager.Instance.DataCenter.AddFaq(faq);
            this.page = ScanProjectManager.Instance.DataCenter.GetFaqs().length - 1;

            await this.UpdateMsg();
        }
    }
}