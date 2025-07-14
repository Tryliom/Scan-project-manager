import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/BaseCommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";

export class Server extends Command
{
    constructor()
    {
        super("server", "", 0, "Open server settings.",
            "Open server settings. Currently only the bot information channel can be set (where changelog are sent).")

        this.SetOnlyInServer();
        this.SetAdmin();
    }

    async Run(interaction)
    {
        await new ServerInterface(interaction).Start();
    }
}

class ServerInterface extends CommandInterface
{
    constructor(interaction)
    {
        super(interaction);

        this.SetEphemeral(true);
        this.SetMenuList([
            {
                onMenuClick: values =>
                {
                    const server = ScanProjectManager.Instance.DataCenter.GetServer(this.Interaction.guildId);

                    server.BotInformationChannelId = values[0];
                },
                menuType: ServerInterface.MenuType.Channel,
                placeholder: "Select a channel..",
            }
        ]);
    }

    ConstructEmbed()
    {
        const server = ScanProjectManager.Instance.DataCenter.GetServer(this.Interaction.guildId);
        const embed = EmbedUtility.GetNeutralEmbedMessage("Server settings");

        embed.addFields([
            {name: "Bot information channel", value: `${server.BotInformationChannelId === "" ? "None" : `<#${server.BotInformationChannelId}>`}`},
            {name: "Visibility", value: `${server.Visibility ? "Visible to everyone" : "Visible to team only"}\nIf set to team only, only the team can see the projects.`}
        ]);

        return embed;
    }

    ConstructComponents()
    {
        const components = [];

        this.AddMenuComponents(components, 0);

        components.push(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("visibility")
                        .setLabel("Visibility")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji({name: "🔄"})
                )
        );

        return components;
    }

    async OnButton(interaction)
    {
        const server = ScanProjectManager.Instance.DataCenter.GetServer(this.Interaction.guildId);

        switch (interaction.customId)
        {
            case "visibility":
                server.Visibility = !server.Visibility;
                break;
        }
    }
}