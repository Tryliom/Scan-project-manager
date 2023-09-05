import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {time} from "discord.js";
import {CustomMenu} from "../../menus/CustomMenu.mjs";

export class Changelogs extends Command
{
    constructor()
    {
        super("changelogs", "", 0, "Show all changelogs.", "Show all changelogs. You can set a channel to receive them automatically with /server command.");
    }

    async Run(interaction)
    {
        const changelogs = this._scanProjectManager.DataCenter.GetChangelogsNewer();
        const embeds = [];

        for (const changelog of changelogs)
        {
            const embed = EmbedUtility.GetNeutralEmbedMessage(`v${changelog.Version}`, changelog.Changes +
                `\n\nPosted ${time(changelog.PostedAt, "R")}`);

            embeds.push(embed);
        }

        if (embeds.length === 0)
        {
            embeds.push(EmbedUtility.GetNeutralEmbedMessage("No changelogs", "There are no changelogs available."));
        }

        await new CustomMenu(interaction, embeds).SetUsePageNumber(false).LaunchMenu();
    }
}