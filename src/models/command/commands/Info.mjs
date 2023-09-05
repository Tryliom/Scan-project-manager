import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {CustomMenu} from "../../menus/CustomMenu.mjs";

export class Info extends Command
{
    constructor()
    {
        super("info", "", 0, "Show information about a project in his channel.",
            "Show information about a project. If there is more than one project associated to the channel, it will show all of them on different pages.");

        this.SetOnlyInServer();
        this.SetOnlyProjectChannel();
    }

    async Run(interaction)
    {
        const projects = this._scanProjectManager.DataCenter.GetProjectsFromChannel(interaction);
        const embeds = [];

        for (let i = 0; i < projects.length; i++)
        {
            const embed = EmbedUtility.GetNeutralEmbedMessage(projects[i].Title, projects[i].Description);

            projects[i].AddToEmbed(embed, true, true, false);

            embeds.push(embed);
        }

        await new CustomMenu(interaction, embeds).SetUsePageNumber(false).LaunchMenu();
    }
}