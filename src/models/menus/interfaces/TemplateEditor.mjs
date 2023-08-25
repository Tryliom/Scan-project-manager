import {ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

import {CommandInterface} from "../CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {Template} from "../../data/Template.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ProjectRole} from "../../data/ProjectRole.mjs";

export class TemplateEditor extends CommandInterface
{
    /** @type {number} */
    _sectionIndex = 0

    /** @type {Template} */
    _template
    /** @type {Template[]} */
    _undoStack = []
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
        this.SaveOldState();
    }

    ConstructEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Template Editor");

        embed.addFields([
            {name: "Name", value: this._template.Name},
            {name: "Description", value: this._template.Description},
            {name: '\u200b', value: '\u200b'},
        ]);

        const sections = [];

        for (let role of this._template.Roles)
        {
            const index = this._template.Roles.indexOf(role);
            const users = [];
            let name = role.Name;

            if (index === this._sectionIndex)
            {
                name = `${EmojiUtility.GetEmoji(EmojiUtility.Emojis.Left)} **${name}**`;
            }

            for (let userID of role.Users)
            {
                users.push(`<@${userID}>`);
            }

            if (users.length === 0)
            {
                users.push("No users");
            }

            sections.push(`${name}: ${users.join("\n")}`);
        }

        if (sections.length === 0)
        {
            sections.push("No sections");
        }

        embed.addFields([{name: "Sections", value: sections.join("\n\n")}]);

        return embed;
    }

    ConstructComponents()
    {
        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`string_edit`)
                    .setLabel("Edit names")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"}),
                new ButtonBuilder()
                    .setCustomId(`section_edit`)
                    .setLabel("Edit section name")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"})
                    .setDisabled(this._template.Roles.length === 0),
                new ButtonBuilder()
                    .setCustomId(`undo`)
                    .setLabel("Undo")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "↩️"})
                    .setDisabled(this._undoStack.length === 0)
            )
        );
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`section_name`)
                    .setLabel("Sections:")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`section_down`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Down))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._sectionIndex === this._template.Roles.length - 1),
                new ButtonBuilder()
                    .setCustomId(`section_up`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Up))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._sectionIndex === 0),
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

        //TODO: Show menu buttons to add or remove users from the section, users already added show up first, can select up to 10 users

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
        if (interaction.customId === "confirm" || interaction.customId === "return")
        {
            const template = interaction.customId === "return" ? null : this._template;
            await this.StopCollector(false);
            await this._onConfirm(template, this.LastInteraction);
        }

        if (interaction.customId === "string_edit")
        {
            const modal = new ModalBuilder()
                .setCustomId("string_edit")
                .setTitle("Fields edition")

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel("Name")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Template name")
                        .setMinLength(1)
                        .setMaxLength(32)
                        .setValue(this._template.Name)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel("Description")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Template description")
                        .setMinLength(1)
                        .setMaxLength(300)
                        .setValue(this._template.Description)
                        .setRequired(true)
                )
            );

            await this.ShowModal(modal);
        }
        else if (interaction.customId === "section_edit")
        {
            const modal = new ModalBuilder()
                .setCustomId("section_edit")
                .setTitle("Section edition");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`section_edit`)
                        .setLabel("Section name")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Section name")
                        .setMinLength(1)
                        .setMaxLength(32)
                        .setValue(this._template.Roles[this._sectionIndex].Name)
                        .setRequired(true)
                )
            );

            await this.ShowModal(modal);
        }
        else if (interaction.customId === "undo")
        {
            this.RestoreOldState();

            return;
        }

        if (interaction.customId === "section_down")
        {
            this._sectionIndex = Math.min(this._sectionIndex + 1, this._template.Roles.length - 1);
        }
        else if (interaction.customId === "section_up")
        {
            this._sectionIndex = Math.max(this._sectionIndex - 1, 0);
        }
        else if (interaction.customId === "section_add")
        {
            const modal = new ModalBuilder()
                .setCustomId("section_add")
                .setTitle("Add section");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`section_add`)
                        .setLabel("Section name")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Section name")
                        .setMinLength(1)
                        .setMaxLength(32)
                        .setRequired(true)
                )
            );

            await this.ShowModal(modal);
        }
        else if (interaction.customId === "section_remove")
        {
            this._template.Roles.splice(this._sectionIndex, 1);
        }

        this.SaveOldState();
    }

    async OnModal(interaction)
    {
        if (interaction.customId === "string_edit")
        {
            const name = interaction.fields.getTextInputValue('name');
            const description = interaction.fields.getTextInputValue('description');

            this._template.Name = name;
            this._template.Description = description;
        }
        else if (interaction.customId === "section_edit")
        {
            this._template.Roles[this._sectionIndex].Name = interaction.fields.getTextInputValue(`section_edit`);
        }
        else if (interaction.customId === "section_add")
        {
            const name = interaction.fields.getTextInputValue(`section_add`);

            this._template.Roles.push(new ProjectRole().FromJson({Name: name, Users: []}));
        }

        this.SaveOldState();
    }

    SaveOldState()
    {
        // Check if the last state is the same as the current one
        if (this._undoStack.length > 0 && JSON.stringify(this._undoStack[this._undoStack.length - 1]) === JSON.stringify(this._template)) return;

        if (this._undoStack.length >= 100)
        {
            this._undoStack.shift();
        }

        this._undoStack.push(new Template().FromJson(this._template));
    }

    RestoreOldState()
    {
        if (this._undoStack.length > 0)
        {
            if (this._undoStack.length > 1) this._undoStack.pop();
            this._template = this._undoStack.pop();
        }
    }
}