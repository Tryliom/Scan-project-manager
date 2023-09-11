import {EmbedUtility} from "./EmbedUtility.mjs";
import {
    ButtonInteraction,
    SelectMenuInteraction,
    EmbedBuilder,
    MessageComponentInteraction,
    CommandInteraction
} from "discord.js";

export class DiscordUtility
{
    /**
     * Reply to an interaction, automatically choose reply or update
     * @param interaction {MessageComponentInteraction, ButtonInteraction, SelectMenuInteraction}
     * @param content {{embeds, content, components}, EmbedBuilder}
     * @param ephemeral {boolean} Whether the message should be ephemeral or not (default: false)
     * @returns {Promise<void>}
     */
    static async Reply(interaction, content, ephemeral = false)
    {
        content = EmbedUtility.FormatMessageContent(content, ephemeral);

        try
        {
            if (interaction instanceof CommandInteraction && !interaction.replied)
            {
                await interaction.reply(content);
            }
            else
            {
                if (interaction.replied || interaction.deferred)
                {
                    await interaction.editReply(content);
                }
                else
                {
                    await interaction.update(content);
                }
            }
        }
        catch (e) {}
    }

    /**
     * Defer automatically if it's not already deferred
     * @param interaction {SelectMenuInteraction | ButtonInteraction}
     * @returns {Promise<void>}
     */
    static async Defer(interaction)
    {
        try
        {
            if (!interaction.deferred)
            {
                await interaction.deferUpdate();
            }
        }
        catch (e) {}
    }

    static MentionRole(roleID)
    {
        return `<@&${roleID}>`;
    }


}