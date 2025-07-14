import {ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

import {CommandInterface} from "../BaseCommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {Template} from "../../data/Template.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ProjectRole} from "../../data/ProjectRole.mjs";

const SelectMenus =
{
    Users: 0,
    SectionMover: 1
};

const Menu =
{
    Editor: 0,
    Info: 1,
};

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
    /** @type {boolean} */
    _onlyRoles = false

    /** @type {Menu} */
    _menu = Menu.Editor
    /** @type {boolean} */
    _moving = false
    /** @type {number} */
    _movingIndex = 0

    /**
     *
     * @param interaction
     * @param lastInteraction
     * @param template {Template}
     * @param onConfirm {function (template: Template, lastInteraction: CommandInteraction)}
     * @param onlyRoles {boolean}
     */
    constructor(interaction, lastInteraction, template, onConfirm, onlyRoles = false)
    {
        super(interaction);

        this.SetLastInteraction(lastInteraction);
        this.SetMenuList([
            // Users list
            {
                onMenuClick: values =>
                {
                    // Remove all users from the section
                    this._template.Roles[this._sectionIndex].Users = [];

                    // Add the selected users to the section
                    for (let value of values)
                    {
                        this._template.Roles[this._sectionIndex].Users.push(value);
                    }

                    this.SaveOldState();
                },
                placeholder: "Select people..",
                maxValues: 5,
                minValues: 0,
                menuType: CommandInterface.MenuType.User
            },
            // Section mover
            {
                onMenuClick: values =>
                {
                    const indexToAttribute = parseInt(values[0]);

                    if (indexToAttribute === this._sectionIndex) return;

                    const section = this._template.Roles.splice(this._sectionIndex, 1)[0];
                    this._template.Roles.splice(indexToAttribute, 0, section);

                    this._sectionIndex = indexToAttribute === this._template.Roles.length ? indexToAttribute - 1 : indexToAttribute;

                    this.SaveOldState();
                },
                getList: () =>
                {
                    const list = [];

                    for (let i = 0; i < this._template.Roles.length; i++)
                    {
                        list.push({label: `Above ${this._template.Roles[i].Name}`, value: i.toString()});

                        if (i === this._sectionIndex)
                        {
                            list[i].default = true;
                        }
                    }

                    if (this._template.Roles.length > 1)
                    {
                        list.push({label: `Last`, value: (this._template.Roles.length).toString()});
                    }

                    return list;
                },
                options: {
                    label: (item) => item.label,
                    value: item => item.value,
                    default: item => item.default || false,
                },
                placeholder: "Move section..",
                menuType: CommandInterface.MenuType.String,
            }
        ]);

        // Make a copy of the template
        this._template = new Template().FromJson(template);
        this._onConfirm = onConfirm;
        this._onlyRoles = onlyRoles;

        this.SaveOldState();
    }

    ConstructEmbed()
    {
        if (this._menu === Menu.Info)
        {
            const embed = EmbedUtility.GetNeutralEmbedMessage(this._onlyRoles ? "Help with role editor" : "Help about template editor");
            const fields = [];

            if (!this._onlyRoles)
            {
                fields.push({name: "Template", value: "Templates are used to create projects. They contain the role names and people assigned to them. Usually used for different teams."});
                fields.push({name: "Name and description", value: "It's just a value to help you remember what the template is for. It's not used anywhere else."});
            }

            embed.addFields([
                ...fields,
                {name: "Sections", value: "Sections are the roles that will be created in the project. You can add or remove sections, and move them around. You can also assign people to them."},
                this.GetMovingExplanation()
            ]);

            // Errors
            if (this._template.Roles.length === 0)
            {
                embed.addFields([
                    {name: "⚠️ Error", value: "You need to add at least one section to the template."},
                ]);
            }

            return embed;
        }

        const embed = EmbedUtility.GetNeutralEmbedMessage(this._onlyRoles ? "Role editor" : "Template Editor");

        if (!this._onlyRoles)
        {
            embed.addFields([
                {name: "Name", value: this._template.Name},
                {name: "Description", value: this._template.Description},
            ]);
        }

        const movingExplanation = this.GetMovingExplanation();

        movingExplanation.name = "ℹ️ " + movingExplanation.name;

        embed.addFields([
            movingExplanation
        ]);

        if (this._moving)
        {
            embed.addFields([
                {name: "Moving", value: `Section \`${this._template.Roles[this._sectionIndex].Name}\` is moving up to section \`${this._template.Roles[this._movingIndex].Name}\` included`},
                {name: "\u200B", value: "\u200B"}
            ]);
        }

        embed.addFields([
            this._template.GetSectionsAsFields(this._moving ? this._movingIndex : this._sectionIndex)
        ]);

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

        const components = [];

        if (this._moving)
        {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`section_moving_cancel`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                new ButtonBuilder()
                    .setCustomId(`section_moving_down`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Down))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._movingIndex === this._template.Roles.length - 1),
                new ButtonBuilder()
                    .setCustomId(`section_moving_up`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Up))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._template.Roles.length === 0 || this._movingIndex === this._sectionIndex + 1),
                new ButtonBuilder()
                    .setCustomId(`section_moving_valid`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✅"})
            ));

            return components;
        }

        const actions = new ActionRowBuilder();

        if (!this._onlyRoles)
        {
            actions.addComponents(
                new ButtonBuilder()
                    .setCustomId(`string_edit`)
                    .setLabel("Edit info")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji({name: "✏️"})
            );
        }

        actions.addComponents(
            new ButtonBuilder()
                .setCustomId(`section_edit`)
                .setLabel("Edit section name")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({name: "✏️"})
                .setDisabled(this._template.Roles.length === 0),
            new ButtonBuilder()
                .setCustomId(`section_set_moving`)
                .setLabel("Set as moving")
                .setEmoji({name: "✏️"})
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this._sectionIndex === this._template.Roles.length - 1 || this._template.Roles.length === 0),
            new ButtonBuilder()
                .setCustomId(`undo`)
                .setLabel("Undo")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({name: "↩️"})
                .setDisabled(this._undoStack.length < 2)
        );

        components.push(actions);
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

        if (this._template.Roles.length > 0)
        {
            this.AddMenuComponents(components, SelectMenus.Users);
        }

        if (this._template.Roles.length > 1)
        {
            this.AddMenuComponents(components, SelectMenus.SectionMover);
        }

        components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`return`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Return)),
                new ButtonBuilder()
                    .setCustomId(`confirm`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji({name: "💾"})
                    .setDisabled(this._template.Roles.length === 0),
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

        if (this._moving)
        {
            if (interaction.customId === "section_moving_cancel")
            {
                this._moving = false;
                this._movingIndex = 0;
            }
            else if (interaction.customId === "section_moving_down")
            {
                this._movingIndex = Math.min(this._movingIndex + 1, this._template.Roles.length - 1);
            }
            else if (interaction.customId === "section_moving_up")
            {
                this._movingIndex = Math.max(this._movingIndex - 1, this._sectionIndex + 1);
            }
            else if (interaction.customId === "section_moving_valid")
            {
                this._template.Roles[this._sectionIndex].Moving = this._movingIndex;
                this._moving = false;
                this._movingIndex = 0;
            }

            return;
        }

        if (interaction.customId === "confirm" || interaction.customId === "return")
        {
            const template = interaction.customId === "return" ? null : this._template;
            await this.StopCollector(false);
            await this._onConfirm(template, this.LastInteraction);
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
                        .setMaxLength(3999)
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
        else if (interaction.customId === "section_set_moving")
        {
            this._moving = true;
            this._movingIndex = this._sectionIndex + 1;
        }
        else if (interaction.customId === "undo")
        {
            this.RestoreOldState();
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

            // Check if a section with moving was dependent on the removed section
            for (let role of this._template.Roles)
            {
                if (role.Moving === this._sectionIndex)
                {
                    role.Moving = -1;
                }
                else if (role.Moving > this._sectionIndex)
                {
                    role.Moving--;
                }
            }

            this._sectionIndex = Math.max(this._sectionIndex - 1, 0);
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
            do {
                let lastState = this._undoStack.pop();

                if (JSON.stringify(lastState) !== JSON.stringify(this._template))
                {
                    this._template = lastState;
                    break;
                }
            } while (this._undoStack.length > 0);
        }
    }

    GetMovingExplanation()
    {
        return {name: "Moving", value: "You can make a section as 'moving', it means that the role can be done in the same time as the next sections until their moving limit you can set. The limit is included within." +
                "\nThey are marked as `RoleName -> MovingRoleName`." +
                "\nFor example: You have the sections `Clean`, `Translation`, `Check` and `Edit`." +
                "\nIf you set `Clean` as moving up to `Check`, it means that the `Clean` role can be done at the same time as `Translation` and `Edit`." +
                "\nYou **must** put the moving role before roles that can be done at the same time."};
    }
}