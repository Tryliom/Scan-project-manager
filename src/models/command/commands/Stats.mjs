import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, time} from "discord.js";
import {StatsType, TimeTypeToString} from "../../data/ServerStats.mjs";

export class Stats extends Command
{
    constructor()
    {
        super("stats", "", 0, "Open statistics panel to manage stats for the server.",
            "Open statistics panel to manage stats for the server. You can enable to announce every week/month the number of chapters done by all users in a specific channel.");

        this.SetOnlyInServer();
        this.SetAdmin();
    }

    async Run(interaction)
    {
        await new StatsInterface(interaction).Start();
    }
}

class StatsInterface extends CommandInterface
{
    constructor(interaction)
    {
        super(interaction);

        this.SetMenuList([
            {
                onMenuClick: values =>
                {
                    const serverStats = ScanProjectManager.Instance.DataCenter.GetServerStats(this.Interaction.guildId);

                    serverStats.ChannelId = values[0];
                },
                menuType: StatsInterface.MenuType.Channel,
                placeholder: "Select a channel..",
            }
        ]);
    }

    ConstructEmbed()
    {
        const serverStats = ScanProjectManager.Instance.DataCenter.GetServerStats(this.Interaction.guildId);
        const embed = EmbedUtility.GetNeutralEmbedMessage("Stats settings");
        const fields = [];

        fields.push({name: "Chapter done count", value: `${serverStats.Enabled[StatsType.ChapterDone] ? "Enabled" : "Disabled"}`});

        if (serverStats.Enabled[StatsType.ChapterDone])
        {
            fields.push({name: "Chapter done time type", value: `${TimeTypeToString(serverStats.ChapterDoneTimeType)}, ` +
                    `${time(serverStats.ChapterDoneTimeLastUpdate, "R")}`});
            fields.push({name: "Channel where announce", value: `${serverStats.ChannelId === "" ? "None" : `<#${serverStats.ChannelId}>`}`});
        }

        embed.addFields(fields);

        return embed;
    }

    ConstructComponents()
    {
        const serverStats = ScanProjectManager.Instance.DataCenter.GetServerStats(this.Interaction.guildId);
        const components = [];

        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`switch_stats_chapter_done`)
                .setLabel(serverStats.Enabled[StatsType.ChapterDone] ? "Disable" : "Enable")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({name: serverStats.Enabled[StatsType.ChapterDone] ? "❌" : "✅"}),
            new ButtonBuilder()
                .setCustomId(`stats_chapter_done_time_type`)
                .setLabel("Switch time type")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!serverStats.Enabled[StatsType.ChapterDone])
                .setEmoji({name: "🔄"}),
            new ButtonBuilder()
                .setCustomId(`stats_chapter_done_reset`)
                .setLabel("Reset time")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!serverStats.Enabled[StatsType.ChapterDone])
                .setEmoji({name: "🔄"})
        ));

        if (serverStats.Enabled[StatsType.ChapterDone])
        {
            this.AddMenuComponents(components, 0);
        }

        return components;
    }

    async OnButton(interaction)
    {
        const serverStats = ScanProjectManager.Instance.DataCenter.GetServerStats(this.Interaction.guildId);

        if (interaction.customId === "switch_stats_chapter_done")
        {
            serverStats.Enabled[StatsType.ChapterDone] = !serverStats.Enabled[StatsType.ChapterDone];
        }
        else if (interaction.customId === "stats_chapter_done_time_type")
        {
            serverStats.SwitchTimeType();
        }
        else if (interaction.customId === "stats_chapter_done_reset")
        {
            serverStats.ResetTimeSpecific();
        }
    }
}