import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {CustomMenu} from "../../menus/CustomMenu.mjs";
import {SecurityUtility} from "../../utility/SecurityUtility.mjs";
import {ButtonStyle} from "discord.js";

export class Help extends Command
{
    constructor()
    {
        super("help", "", 0, "Show all available commands.", "Show all available commands with more explanations and support server link.");
    }

    async Run(interaction)
    {
        const embeds = [];
        let description = "";
        let count = 0;
        const projectInChannel = this._scanProjectManager.DataCenter.GetProjectFromChannel(interaction);

        for (const command of this._commandController.Commands)
        {
            const index = this._commandController.Commands.indexOf(command);

            if (command.OnlyCreator && !SecurityUtility.IsCreator(interaction)) continue;
            if (command.OnlyInServer && !interaction.guildId) continue;
            if (command.OnlyProjectChannel && !projectInChannel) continue;
            if (command.Admin && !SecurityUtility.IsAdmin(interaction)) continue;

            const args = command.Args !== "" ? `options: \`${command.Args}\`` : "";
            const desc = command.LongDescription !== "" ? command.LongDescription : command.Description;

            description += `## /${command.Name} ${args}\n${desc}\n`;
            count++;

            if (count === 5 || (index + 1) === this._commandController.Commands.length)
            {
                embeds.push(EmbedUtility.GetGoodEmbedMessage("Help").setDescription(description));
                description = "";
                count = 0;
            }
        }

        if (count > 0)
        {
            embeds.push(EmbedUtility.GetGoodEmbedMessage("Help").setDescription(description));
        }

        const actions = [
            {
                text: "Support Server",
                url: "https://discord.gg/63avpZ7wWN",
                color: ButtonStyle.Link
            }
        ];

        await new CustomMenu(interaction, embeds, [actions]).LaunchMenu();
    }
}