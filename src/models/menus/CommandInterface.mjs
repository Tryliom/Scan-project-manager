import APIMessageComponentEmoji, {
    ButtonStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder, SelectMenuInteraction, StringSelectMenuBuilder,
    ButtonInteraction, InteractionCollector, ModalSubmitInteraction, CommandInteraction
} from "discord.js";
import {StringUtility} from "../utility/StringUtility.mjs";
import {DiscordUtility} from "../utility/DiscordUtility.mjs";
import {EmbedUtility} from "../utility/EmbedUtility.mjs";

const CollectorTime = 90 * 60000;

/**
 * Extend this class to create a command interface<br>
 * You can override the following functions:
 * <ul>
 *     <li>ConstructEmbed()</li>
 *     <li>ConstructComponents()</li>
 *     <li>OnButton(interaction)</li>
 *     <li>OnMenu(interaction)</li>
 *     <li>OnModal(interaction)</li>
 *     <li>OnMenuInteraction(interaction): Call it at the end of the function</li>
 *     <li>OnMenuPageChange(index): Call it at the end of the function</li>
 *     <li>OnChangePage()</li>
 * </ul>
 */
export class CommandInterface
{
    /**
     * @brief The original interaction that started the command
     * @type {CommandInteraction} */
    Interaction
    /**
     * @brief The last interaction that was made by the user
     * @type {ButtonInteraction | SelectMenuInteraction | null} */
    LastInteraction
    /** @type {[{onMenuClick: Function, getList: Function, options: {label: Function, value: Function}, placeholder: string}], []} */
    MenuList
    /** @type {boolean} */
    Ephemeral

    /** @type {string} */
    Error
    /** @type {string} */
    ConfirmationMessage
    /** @type {boolean} */
    IgnoreInteractions

    /** @type {InteractionCollector} */
    Collector

    /** @type {Object<string, number>} */
    _menus = {}


    /**
     * Command interface constructor
     * @constructor
     * @param interaction {CommandInteraction}
     */
    constructor(interaction)
    {
        this.Interaction = interaction;

        this.Error = "";
        this.ConfirmationMessage = "";
        this.IgnoreInteractions = false;
    }

    SetLastInteraction(interaction)
    {
        this.LastInteraction = interaction;

        return this;
    }

    SetMenuList(menuList)
    {
        this.MenuList = menuList;

        for (let item of this.MenuList)
        {
            this._menus[`menu${this.MenuList.indexOf(item)}`] = 0;
        }

        return this;
    }

    SetEphemeral(ephemeral)
    {
        this.Ephemeral = ephemeral;

        return this;
    }

    async Start()
    {
        const filter = (interaction) => interaction.user.id === this.Interaction.user.id || interaction.user.id === process.env.creatorId;

        await this.UpdateMsg();

        const currentInteraction = this.LastInteraction || this.Interaction;
        const message = await currentInteraction.fetchReply();

        this.Collector = message.createMessageComponentCollector({ filter, time: CollectorTime });
        this.Collector.on("collect", async interaction =>
        {
            this.LastInteraction = interaction;

            if (this.IgnoreInteractions) return;

            if (interaction.isButton()) await this.OnButtonClick(interaction);
            else if (interaction.isAnySelectMenu()) await this.OnMenuClick(interaction);
            else if (interaction.isModalSubmit()) await this.OnModalSubmit(interaction);

            await DiscordUtility.Defer(interaction);

            this.Collector.resetTimer({ time: CollectorTime });
        });
    }

    /**
     * Update message by calling constructEmbed() and constructComponents() or the content
     * @param content {{embeds, content, components} | EmbedBuilder | null}
     * @returns {Promise<void>}
     */
    async UpdateMsg(content = null)
    {
        const interaction = this.LastInteraction || this.Interaction;

        if (this.Error !== "")
        {
            content = EmbedUtility.GetBadEmbedMessage("An error occurred")
                .setDescription(`${this.Error}\n\nYou will return to the menu after 5sec`);
        }
        else if (this.ConfirmationMessage !== "")
        {
            content = EmbedUtility.GetGoodEmbedMessage("Confirmation")
                .setDescription(`${this.ConfirmationMessage}\n\nYou will return to the menu after 5sec`);
        }

        if (this.Collector && !this.Collector.ended || !this.Collector)
        {
            await DiscordUtility.Reply(interaction, this.GetContent(content), this.Ephemeral);
        }
    }

    async ShowModal(modal)
    {
        const interaction = this.LastInteraction || this.Interaction;

        await interaction.showModal(modal);
    }

    /**
     * Format any content to send
     * @param content {{embeds, content, components} | EmbedBuilder | null}
     * @returns {{embeds, content, components}}
     */
    GetContent(content = null)
    {
        return EmbedUtility.FormatMessageContent(content || {embeds: this.ConstructEmbed(), components: this.ConstructComponents()});
    }

    /**
     * Called when a button is clicked
     * @param interaction {ButtonInteraction}
     * @returns {Promise<void>}
     */
    async OnButtonClick(interaction)
    {
        await this.OnButton(interaction);

        if (interaction.customId === "close")
        {
            await this.StopCollector(true);
        }
        else
        {
            await this.UpdateMsg();
        }
    }

    async OnButton(interaction) {}

    /**
     * Event when a menu is clicked
     * @param interaction {SelectMenuInteraction}
     * @returns {Promise<void>}
     */
    async OnMenuClick(interaction)
    {
        await this.OnMenu(interaction);

        await this.OnMenuInteraction(interaction);
        await this.UpdateMsg();
    }

    async OnMenu(interaction) {}

    /**
     * Event when a modal is submitted
     * @param interaction {ModalSubmitInteraction}
     * @returns {Promise<void>}
     * @constructor
     */
    async OnModalSubmit(interaction)
    {
        await this.OnModal(interaction);

        await this.UpdateMsg();
    }

    async OnModal(interaction) {}

    async StopCollector(closeMessage = true)
    {
        if (closeMessage)
        {
            await this.UpdateMsg(EmbedUtility.GetClosedEmbedMessage());
            setTimeout(() => (this.LastInteraction || this.Interaction).deleteReply(), 5000);
        }
        else
        {
            await this.UpdateMsg(this.ConstructEmbed());
        }

        this.Collector.stop();
    }

    /**
     * Use this function if you need to do something when menu page change (not call if it's less and more)
     * @param index
     * @returns
     */
    OnMenuPageChange(index) {}

    /**
     * Set the menu page from the list
     * @param index start at 0
     * @param value integer
     */
    SetMenuPage(index, value)
    {
        this._menus[`menu${index}`] = value;
    }

    UpdateMenuPageWithPage(index, page)
    {
        let guessPage = 0;
        let minElements = 0;

        if (page < 24)
        {
            this.SetMenuPage(index, 0);
        }
        else
        {
            minElements = 24;

            while (page >= minElements) {
                guessPage++;
                minElements += 22;
            }

            this.SetMenuPage(index, guessPage);
        }
    }

    ConstructEmbed() 
    {
        return EmbedUtility.GetNeutralEmbedMessage("Default embed");
    }

    ConstructComponents() 
    {
        return [];
    }

    GetCloseButton() 
    {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Close")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("close")
        )
    }

    GetChangePageButtons()
    {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setEmoji({name: "⏪"})
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("changepage-back+"),
                new ButtonBuilder()
                    .setEmoji({name: "◀️"})
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("changepage-back"),
                new ButtonBuilder()
                    .setEmoji({name: "▶️"})
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("changepage-next"),
                new ButtonBuilder()
                    .setEmoji({name: "⏩"})
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("changepage-next+")
            );
    }

    /**
     *
     * @param page If this doesn't have more than 1 page, put 0
     * @param list {*[]}
     * @param option {{label: Function, value: Function, emoji: Function | undefined, description: Function | undefined, condition: Function | undefined}}
     * @returns {*[]}
     */
    GetOptions(page, list, option = {label: (item) => item, value: (item) => item})
    {
        const optionList = [];

        if (page > 0) optionList.push({label: "Less...", emoji: "⬅", value: "less"});

        let minElements = 0;

        if (page > 0)   minElements = 24;
        if (page !== 1) minElements += (page - 1) * 22;

        for (let item of list)
        {
            if (minElements > list.indexOf(item)) continue;

            if (optionList.length === 24)
            {
                optionList.push({label: "More...", emoji: "➡", value: "more"})
                break;
            }
            else if (!option.condition || option.condition(item))
            {
                const newOption = {label: StringUtility.CutText(option.label(item), 100), value: `${option.value(item)}`};

                if (option.emoji)
                {
                    const emoji = option.emoji(item);
                    if (emoji) newOption.emoji = emoji;
                }

                if (option.description)
                {
                    newOption.description = StringUtility.CutText(option.description(item), 100);
                }

                optionList.push(newOption);
            }
        }

        return optionList;
    }

    async OnMenuInteraction(interaction)
    {
        for (let item of this.MenuList)
        {
            const index = this.MenuList.indexOf(item);

            if (interaction.customId === `menu${index}`)
            {
                if (interaction.values[0] === "less")
                {
                    this._menus[`menu${index}`]--;
                }
                else if (interaction.values[0] === "more")
                {
                    this._menus[`menu${index}`]++;
                }
                else
                {
                    await item.onMenuClick(interaction.values[0]);
                    this.OnMenuPageChange(index);
                }
            }
        }
    }

    AddMenuComponents(components, index = null)
    {
        for (let item of this.MenuList)
        {
            const i = this.MenuList.indexOf(item);

            if (index === null || index === i)
            {
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`menu${i}`)
                                .setPlaceholder(item.placeholder)
                                .setMinValues(1)
                                .setMaxValues(1)
                                .addOptions(...this.GetOptions(this._menus[`menu${i}`], item.getList(), item.options))
                        )
                );
            }
        }
    }

    OnButtonChangePage(interaction, maxPage, index = null)
    {
        switch (interaction.customId)
        {
            case "changepage-next": this.page++; break;
            case "changepage-back": this.page--; break;
            case "changepage-next+": this.page += 25; break;
            case "changepage-back+": this.page -= 25; break;
        }

        if (this.page > maxPage-1)  this.page = 0;
        else if (this.page < 0)     this.page = maxPage-1;

        if (interaction.customId.startsWith("changepage"))
        {
            this.OnChangePage();
            if (index) this.UpdateMenuPageWithPage(index, this.page);
        }
    }

    OnChangePage() {}

    /**
     * Display an error during 5sec, the component is completely change during this period
     * @param errorContent {string}
     * @returns {Promise<void>}
     */
    async DisplayError(errorContent)
    {
        await DiscordUtility.Defer(this.LastInteraction);

        this.Error = errorContent;

        await this.UpdateMsg();

        setTimeout(() =>
        {
            this.Error = "";
            this.UpdateMsg();
        }, 5000);
    }

    /**
     * Display a confirmation message during 5sec, the component is completely change during this period
     * @param message {string}
     * @returns {Promise<void>}
     */
    async DisplayConfirmationMessage(message)
    {
        await DiscordUtility.Defer(this.LastInteraction);

        this.ConfirmationMessage = message;

        await this.UpdateMsg();

        setTimeout(() =>
        {
            this.ConfirmationMessage = "";
            this.UpdateMsg();
        }, 5000);
    }
}