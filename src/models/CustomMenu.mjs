import APIMessageComponentEmoji, {
    Message, ButtonStyle, MessageComponentInteraction, EmbedBuilder, SelectMenuBuilder, ActionRowBuilder, ButtonBuilder, SelectMenuInteraction
} from "discord.js";
import {v4} from "uuid";

import {SecurityUtility} from "./utility/SecurityUtility.mjs";
import {StringUtility} from "./utility/StringUtility.mjs";
import {DiscordUtility} from "./utility/DiscordUtility.mjs";
import {EmbedUtility} from "./utility/EmbedUtility.mjs";
import {Logger} from "./utility/Logger.mjs";

/**
 * @type {{next: ((function(CustomMenu): Promise<void>)), back: ((function(CustomMenu): Promise<void>))}}
 */
const defaultMenuAction = {
    "back": async (menu) =>
    {
        if (menu.Page === 0) menu.Page = menu.Pages.length - 1;
        else menu.Page--;

        await menu.updateView();
    },
    "next": async (menu) =>
    {
        if (menu.Page === menu.Pages.length - 1) menu.Page = 0;
        else menu.Page++;

        await menu.updateView();
    }
}

/**
 * Open a interaction menu for 15 minutes max
 */
export class CustomMenu
{
    /** @type {MessageComponentInteraction | null} */
    LastInteraction
    /** @type {MessageComponentInteraction} */
    Interaction
    /** @type {EmbedBuilder[]} */
    Pages
    /** @type {{text: string, url: string, color: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER" | "LINK" | ButtonStyle,
     * emoji: APIMessageComponentEmoji, disabled: boolean, function(CustomMenu): Function, disableOnUse: boolean, disableAllOnUse: boolean, closeOnUse: Integer}[][]} */
    Actions
    /** @type {{label: string, description: string, emoji: string}[]} */
    MenuPages
    /** @type {number} */
    Page
    /** @type {EmbedBuilder} */
    CurrentPage
    /** @type {number} */
    CurrentMenuPage
    /** @type {string} */
    Id


    /**
     * Custom menu constructor
     * @param interaction {MessageComponentInteraction}
     * @param pages {EmbedBuilder[]}
     * @param actions {{text: string, url: string, color: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER" | "LINK" | ButtonStyle,
     * emoji: APIMessageComponentEmoji, disabled: boolean, function(CustomMenu): Function, disableOnUse: boolean, disableAllOnUse: boolean, closeOnUse: Integer}[][]}
     * @param menuPages {{label: string, description: string, emoji: string}[]}
     */
    constructor(interaction, pages, actions = [], menuPages = [])
    {
        // Set a footer to each embed with the page number if there is no footer
        for (let page of pages)
        {
            if (page.data.footer) continue;

            page.setFooter({text: `Page ${pages.indexOf(page) + 1}/${pages.length}`});
        }

        this.Interaction = interaction;
        this.Pages = pages;
        this.Actions = actions;
        this.MenuPages = menuPages;

        this.LastInteraction = null;
        this.Page = 0;
        this.CurrentPage = this.Pages[this.Page];
        this.CurrentMenuPage = 0;
        this.Id = v4();
    }

    launchMenu()
    {
        this.updateView().catch(error => { Logger.Log(error); });
    }

    async updateView()
    {
        this.CurrentPage = this.Pages[this.Page];
        const components = [];

        if (this.MenuPages.length === 0 && this.Pages.length > 1)
        {
            for (let i = 1; i <= this.Pages.length; i++)
            {
                this.MenuPages.push({description: `Page ${i}`}); // Used after and set correctly
            }
        }

        if (this.MenuPages.length > 1)
        {
            const options = [];

            if (this.CurrentMenuPage > 0)
            {
                options.push({ label: "Less...", emoji: "⬅", value: "less" });
            }

            let minElements = 0;

            if (this.CurrentMenuPage > 0) minElements = 24;
            if (this.CurrentMenuPage !== 1) minElements += (this.CurrentMenuPage - 1) * 22;

            for (let menuPage of this.MenuPages)
            {
                const index = this.MenuPages.indexOf(menuPage);

                if (minElements > index) continue;

                if (options.length === 24)
                {
                    options.push({label: "More...", emoji: "➡", value: "more"})
                    break;
                }

                let label = index === this.Page ? "Current" : `Page ${index + 1}`;

                if (menuPage.label) label = menuPage.label;

                const option =
                    {
                        label: index === this.Page ? "Current" : `Page ${index + 1}`,
                        description: StringUtility.CutText(menuPage.description, 100),
                        value: `${index}`,
                    };

                if (menuPage.emoji) option.emoji = menuPage.emoji;
                if (index === this.Page) option.default = true;

                options.push(option);
            }

            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new SelectMenuBuilder()
                            .setCustomId("menu")
                            .setPlaceholder("Go to...")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .addOptions(...options)
                    )
            );

            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setEmoji({name: "◀️"})
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("back"),
                        new ButtonBuilder()
                            .setEmoji({name: "▶️"})
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId("next")
                    )
            );
        }

        if (this.Actions.length > 0 && this.Actions[this.Page] && this.Actions[this.Page].length > 0)
        {
            let buttons = new ActionRowBuilder();

            for (let action of this.Actions[this.Page])
            {
                const button = new ButtonBuilder()
                    .setLabel(action.text || "")
                    .setStyle(action.url ? ButtonStyle.Link : action.color || ButtonStyle.Primary)
                    .setDisabled(action.disabled || false);

                if (action.emoji) button.setEmoji(action.emoji);
                if (action.url) button.setURL(action.url);
                else button.setCustomId(`${this.Actions[this.Page].indexOf(action)}`);

                buttons.addComponents(button);

                if (buttons.components.length === 5 && this.Actions[this.Page].indexOf(action) !== this.Actions[this.Page].length - 1)
                {
                    if (this.Actions[this.Page].indexOf(action) === 10) break;

                    components.push(new ActionRowBuilder().addComponents(buttons.components));
                    buttons = new ActionRowBuilder();
                }
            }

            components.push(buttons);
        }

        components.push(new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId("close")
            )
        );

        const currentIntegration = this.LastInteraction || this.Interaction;

        await DiscordUtility.Reply(currentIntegration, {embeds: this.CurrentPage, components: components});

        if (this.collector) this.collector.stop();

        const filter = (i) => i.user.id === currentIntegration.user.id || SecurityUtility.IsAdmin(i);
        /** @type {Message} */
        const message = await currentIntegration.fetchReply();
        this.collector = message.createMessageComponentCollector({filter, time: 60 * 60000});
        this.collector.on("collect", async interaction =>
        {
            this.LastInteraction = interaction;

            if (interaction.isStringSelectMenu())
            {
                // Convert it to SelectMenuInteraction
                const selectMenuInteraction = SelectMenuInteraction.from(interaction);

                if (selectMenuInteraction.customId === "menu")
                {
                    if (selectMenuInteraction.values[0] === "less")
                    {
                        this.CurrentMenuPage--;
                    }
                    else if (selectMenuInteraction.values[0] === "more")
                    {
                        this.CurrentMenuPage++;
                    }
                    else
                    {
                        this.Page = parseInt(selectMenuInteraction.values[0]);
                    }

                    await this.updateView();
                }
            }
            else
            {
                if (this.Actions[this.Page])
                {
                    const action = this.Actions[this.Page][interaction.customId];

                    if (action && action.function)
                    {
                        if (action.disableOnUse) action.disabled = true;
                        if (action.disableAllOnUse) this.Actions[this.Page].forEach(item => item.disabled = true);

                        action.function(this);

                        if (action.closeOnUse) setTimeout(() => this.closeAll(), action.closeOnUse);
                    }
                }

                if (defaultMenuAction[interaction.customId])    await defaultMenuAction[interaction.customId](this);
                if (interaction.customId === "close")           await this.closeAll();
            }

            await DiscordUtility.Defer(interaction);
        });
    }

    async closeAll()
    {
        this.collector.stop();
        await DiscordUtility.Reply(this.LastInteraction || this.Interaction, EmbedUtility.GetClosedEmbedMessage());
        setTimeout(() => (this.LastInteraction || this.Interaction).deleteReply(), 5000);
    }
}