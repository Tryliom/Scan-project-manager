import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {CustomMenu} from "../../menus/CustomMenu.mjs";
import {SecurityUtility} from "../../utility/SecurityUtility.mjs";

export class Help extends Command
{
    constructor()
    {
        super("help", "", 0, "Show all available commands.");
    }

    async Run(interaction)
    {
        const list = [];
        const getDefaultEmbed = () => EmbedUtility.GetGoodEmbedMessage("Help");
        let embedMessage = getDefaultEmbed();

        for (const command of this._commandController.Commands)
        {
            const index = this._commandController.Commands.indexOf(command);

            if (command.Admin && SecurityUtility.IsAdmin(interaction) || !command.Admin)
            {
                embedMessage.addFields(
                    {
                        name: "/" + command.Name + " " + command.Args,
                        value: command.Description,
                        inline: true
                    }
                );
            }

            if (embedMessage.data.fields.length === 5 || (index + 1) === this._commandController.Commands.length)
            {
                list.push(embedMessage);
                embedMessage = getDefaultEmbed();
            }
        }

        await new CustomMenu(interaction, list).LaunchMenu();
    }
}