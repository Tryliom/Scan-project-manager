import {ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction} from "discord.js";

import {CommandInterface} from "../CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {Template} from "../../data/Template.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";

export class TemplateEditor extends CommandInterface
{
    /** @type {number} */
    _sectionIndex = 0

    /** @type {Template} */
    _template
    /** @type {function (template: Template, lastInteraction: CommandInteraction)} */
    _onConfirm

    /**
     *
     * @param interaction
     * @param lastInteraction
     * @param template {Template}
     * @param onConfirm {function (template: Template, lastInteraction: CommandInteraction)}
     */
    constructor(interaction, lastInteraction, template, onConfirm)
    {
        super(interaction);

        this.SetLastInteraction(lastInteraction);

        // Make a copy of the template
        this._template = new Template().FromJson(template);
        this._onConfirm = onConfirm;
    }

    ConstructEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Template Editor");

        embed.addFields([
            {name: "Name", value: this._template.Name},
            {name: "Description", value: this._template.Description},
        ]);

        const fields = [];

        for (let role of this._template.Roles)
        {
            const index = this._template.Roles.indexOf(role);
            const users = [];
            let name = role.Name;

            if (index === this._sectionIndex)
            {
                name = `**> ${name}**`;
            }

            for (let userID of role.Users)
            {
                users.push(`<@${userID}>`);
            }

            if (users.length === 0)
            {
                users.push("None");
            }

            fields.push({name: name, value: users.join(", ")});
        }

        if (fields.length === 0)
        {
            fields.push({name: "No sections", value: "Add a section to get started!"});
        }

        embed.addFields(...fields);

        return embed;
    }

    ConstructComponents()
    {
        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`name_description`)
                    .setLabel("Name & Description:")
                    .setDisabled(true)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`name_description_edit`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"})
            )
        );
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`section_down`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Down))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._sectionIndex === 0),
                new ButtonBuilder()
                    .setCustomId(`section_up`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Up))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._sectionIndex === this._template.Roles.length - 1),
                new ButtonBuilder()
                    .setCustomId(`section_edit`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"})
                    .setDisabled(this._template.Roles.length === 0),
                new ButtonBuilder()
                    .setCustomId(`section_add`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Add))
                    .setDisabled(this._template.Roles.length >= 20),
                new ButtonBuilder()
                    .setCustomId(`section_remove`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji({name: "🗑️"})
                    .setDisabled(this._template.Roles.length === 0)
            )
        );

        //TODO: Show menu buttons to add or remove users from the section, users already added show up first

        components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`return`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                new ButtonBuilder()
                    .setCustomId(`confirm`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji({name: "💾"})
            )
        );

        return components;
    }

    async OnButton(interaction)
    {
        if (interaction.customId === "return")
        {
            await this.StopCollector(false);
            await this._onConfirm(null, this.LastInteraction);
        }
        else if (interaction.customId === "confirm")
        {
            await this.StopCollector(false);
            await this._onConfirm(this._template, this.LastInteraction);
        }

        if (interaction.customId === "name_description_edit")
        {
            //TODO: Open a modal to edit the name and description
        }

        if (interaction.customId === "section_down")
        {
            this._sectionIndex = Math.min(this._sectionIndex + 1, this._template.Roles.length - 1);
        }
        else if (interaction.customId === "section_up")
        {
            this._sectionIndex = Math.max(this._sectionIndex - 1, 0);
        }
    }
}