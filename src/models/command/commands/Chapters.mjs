import {Command} from "../Command.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {DiscordUtility} from "../../utility/DiscordUtility.mjs";
import {SecurityUtility} from "../../utility/SecurityUtility.mjs";
import {StringUtility} from "../../utility/StringUtility.mjs";

export class Chapters extends Command
{
    constructor()
    {
        super("chapters", "add, remove, from", 1, "Add/remove chapter(s) to/from a project.");

        this.SetOnlyInServer();
    }

    AddSubCommands(slashCommand)
    {
        slashCommand.addStringOption(option => option.setName("add")
            .setDescription("Use '-' to add a range of chapters and ',' to add multiple chapters (ex: 1-5,5.5,6-8)"));
        slashCommand.addStringOption(option => option.setName("remove")
            .setDescription("Use '-' to add a range of chapters and ',' to add multiple chapters (ex: 1-5,5.5,6-8)"));
        slashCommand.addStringOption(option => option.setName("from")
            .setDescription("Project where to add chapters, use if you're not in a project channel").setAutocomplete(true));
    }

    async OnAutocomplete(interaction, focusedOption)
    {
        if (focusedOption.name !== "from") return;

        const result = [];
        const projects = this._scanProjectManager.DataCenter.GetProjects(interaction);
        const projectLength = Object.keys(projects).length;

        if (projectLength === 0)
        {
            await interaction.respond([{name: "There are no projects available in this server", value: "none"}]);
            return;
        }

        for (let projectId in projects)
        {
            /** @type {Project} */
            const project = projects[projectId];

            if (project.Title.toLowerCase().includes(focusedOption.value.toString().toLowerCase()))
            {
                result.push({name: project.Title, value: projectId});

                if (result.length === 25) break;
            }
        }

        await interaction.respond(result);
    }


    async Run(interaction)
    {
        const projectOption = interaction.options.get("from");
        let project = this._scanProjectManager.DataCenter.GetProjectFromChannel(interaction);

        if (projectOption)
        {
            project = this._scanProjectManager.DataCenter.GetProject(interaction, projectOption.value);

            if (!project)
            {
                return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("Invalid project specified."), true);
            }
        }
        else
        {
            // Check if there is multiple projects in the same channel
            if (this._scanProjectManager.DataCenter.IsMultipleProjectsInChannel(interaction))
            {
                return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("There is multiple projects in this channel. Please specify a project."), true);
            }
        }

        if (!project)
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You must be in a project channel or specify a project."), true);
        }

        // If not admin or not the project manager of the project, return
        if (!SecurityUtility.IsAdmin(interaction) && !project.ProjectManagers.includes(interaction.member.id))
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You must be the project manager or an admin to do this."), true);
        }

        let startChapters = interaction.options.get("add");
        let removeChapters = interaction.options.get("remove");

        if (startChapters)
        {
            startChapters = StringUtility.ReplaceAll(startChapters.value, " ", "");
        }

        if (removeChapters)
        {
            removeChapters = StringUtility.ReplaceAll(removeChapters.value, " ", "");
        }

        // If startChapters and removeChapters are both defined, return
        if (startChapters && removeChapters)
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You cannot add and remove chapters at the same time."), true);
        }
        else if (!startChapters && !removeChapters)
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You must add or remove chapters."), true);
        }

        const chapters = startChapters ? startChapters.split(",") : removeChapters.split(",");
        const chaptersToAdd = [];
        const result = [];

        for (const chapter of chapters)
        {
            const chapterSplitted = chapter.split("-");
            let chapterStart = parseFloat(chapterSplitted[0]);
            let chapterEnd = parseFloat(chapterSplitted[1]);
            let increment = 1;

            if (isNaN(chapterStart) || isNaN(chapterEnd))
            {
                chapterStart = parseFloat(chapter);
                chapterEnd = chapterStart;

                if (isNaN(chapterStart))
                {
                    return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("Invalid chapter number."), true);
                }
            }

            result.push(chapterStart === chapterEnd ? chapterStart : `${chapterStart} to ${chapterEnd}`);

            // If chapterStart or chapterEnd is not a whole number, change increment to decimal point accordingly to chapterStart or chapterEnd
            if (chapterStart % 1 !== 0 || chapterEnd % 1 !== 0)
            {
                increment = chapterStart % 1 !== 0 ? chapterStart % 1 : chapterEnd % 1;
            }

            if (chapterStart > chapterEnd)
            {
                const temp = chapterStart;
                chapterStart = chapterEnd;
                chapterEnd = temp;
            }

            for (let i = chapterStart; i <= chapterEnd; i += increment)
            {
                // Check if chapter already exists
                const found = project.Tasks.find(task => task.Name === i.toString());

                if (startChapters && found) continue;
                if (removeChapters && !found) continue;

                chaptersToAdd.push(i);
            }
        }

        // If chaptersToAdd is empty, return
        if (chaptersToAdd.length === 0)
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("There is no chapters to add."), true);
        }

        // If chaptersToAdd is more than 100, return
        if (chaptersToAdd.length > 100)
        {
            return await DiscordUtility.Reply(interaction, EmbedUtility.GetBadEmbedMessage("You cannot add more than 100 chapters at once."), true);
        }

        // Add/remove chapters to project
        if (startChapters)
        {
            this._scanProjectManager.DataCenter.AddChapters(interaction, project.Id, chaptersToAdd);

            return await DiscordUtility.Reply(interaction, EmbedUtility.GetGoodEmbedMessage(`Added chapters ${result.join(", ")} to ${project.Title}.`), true);
        }
        else
        {
            this._scanProjectManager.DataCenter.RemoveChapters(interaction, project.Id, chaptersToAdd);

            return await DiscordUtility.Reply(interaction, EmbedUtility.GetGoodEmbedMessage(`Removed chapters ${result.join(", ")} from ${project.Title}.`), true);
        }
    }
}