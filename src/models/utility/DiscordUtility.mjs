import {EmbedUtility} from "./EmbedUtility.mjs";
import {ButtonInteraction, SelectMenuInteraction, EmbedBuilder, MessageComponentInteraction} from "discord.js";

export class DiscordUtility
{
    /**
     * Reply to an interaction, automatically choose reply or update
     * @param interaction {MessageComponentInteraction, ButtonInteraction, SelectMenuInteraction}
     * @param content {{embeds, content, components}, EmbedBuilder}
     * @returns {Promise<void>}
     */
    static async Reply(interaction, content)
    {
        content = EmbedUtility.FormatMessageContent(content);

        try
        {
            if (interaction instanceof ButtonInteraction || interaction instanceof SelectMenuInteraction)
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
            else if (!interaction.replied && !interaction.deferred)
            {
                await interaction.reply(content);
            }
            else
            {
                await interaction.editReply(content);
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