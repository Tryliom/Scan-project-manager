import {CommandInterface} from "../CommandInterface.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction} from "discord.js";

export class ConfirmationInterface extends CommandInterface
{
    /** @type {function (response: boolean, lastInteraction: CommandInteraction)} */
    _onConfirm
    /** @type {string} */
    _confirmation

    /**
     *
     * @param interaction
     * @param lastInteraction
     * @param confirmation {string}
     * @param onConfirm {function (response: boolean, lastInteraction: CommandInteraction)}
     */
    constructor(interaction, lastInteraction, confirmation, onConfirm)
    {
        super(interaction);

        this.SetLastInteraction(lastInteraction);

        this._onConfirm = onConfirm;
        this._confirmation = confirmation;
    }

    ConstructEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Confirmation");
        embed.setDescription(this._confirmation);

        return embed;
    }

    ConstructComponents()
    {
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`yes`)
                    .setLabel("Yes")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`no`)
                    .setLabel("No")
                    .setStyle(ButtonStyle.Secondary)
            )
        ];
    }

    async OnButton(interaction)
    {
        if (interaction.customId !== "yes" && interaction.customId !== "no") return;

        let confirm = interaction.customId === "yes";

        await this.StopCollector(false);
        await this._onConfirm(confirm, this.LastInteraction);
    }
}