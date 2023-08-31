import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {CustomMenu} from "../../menus/CustomMenu.mjs";

export class Info extends Command
{
    constructor()
    {
        super("info", "", 0, "Show information about a project.");

        this.SetOnlyInServer();
        this.SetOnlyProjectChannel();
    }

    async Run(interaction)
    {
        const projects = this._scanProjectManager.DataCenter.GetProjectsFromChannel(interaction);
        const embeds = [];

        for (let i = 0; i < projects.length; i++)
        {
            const embed = EmbedUtility.GetNeutralEmbedMessage("Project info");

            projects[i].AddToEmbed(embed, true, true);

            embed.setFooter({text: `Project ${i + 1}/${projects.length}`});

            embeds.push(embed);
        }

        await new CustomMenu(interaction, embeds).LaunchMenu();
    }
}