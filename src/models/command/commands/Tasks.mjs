import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import {StatsType} from "../../data/ServerStats.mjs";

export class Tasks extends Command
{
    constructor()
    {
        super("tasks", "", 0, "Show all your tasks/chapters to do.",
            "This command will show you all the tasks/chapters you have to do for all your projects. If you do the command in a project channel, it will show you the tasks/chapters for this project directly.\n" +
            "There is more information in /faq command.");
    }

    async Run(interaction)
    {
        await new TaskInterface(interaction).Start();
    }
}

class TaskInterface extends CommandInterface
{
    /** @type {{serverId: string, project: Project, tasks: {task: Task, roleAvailable: number[]}[]}[]}
     * Tasks per projects
     * */
    _tasks = [];
    /** @type {number} */
    page = 0;
    /** @type {number} */
    _selectedRoleIndex = 0;
    /** @type {Object<number, string[]>} */
    _chaptersForRole = {};
    /** @type {boolean} */
    _needToUpdateSelection = false;

    constructor(interaction)
    {
        super(interaction);

        this._tasks = ScanProjectManager.Instance.DataCenter.GetProjectWithTasks(this.Interaction.user.id);

        // Check if the command come from a project channel, then set the page to the project
        for (let i = 0; i < this._tasks.length; i++)
        {
            const task = this._tasks[i];

            if (task.project.ChannelId === this.Interaction.channelId)
            {
                this.page = i;
                break;
            }
        }

        this.SetMenuList([
            {
                onMenuClick: values =>
                {
                    this.page = parseInt(values[0]);

                    if (this.page >= this._tasks.length) this.page = 0;
                },
                getList: () => this._tasks,
                options:
                {
                    label: item => item.project.Title,
                    description: item => item.project.Description,
                    value: item => this._tasks.indexOf(item),
                    default: item => item.project.Id === this._tasks[this.page].project.Id
                },
                placeholder: "Select project.."
            },
            {
                onMenuClick: values =>
                {
                    const chapters = [];
                    let i = 0;

                    for (let chapter of this._chaptersForRole[this._selectedRoleIndex])
                    {
                        chapters.push(parseInt(chapter));

                        if (i === parseInt(values[0])) break;

                        i++;
                    }

                    const tasksDone = ScanProjectManager.Instance.DataCenter.DoneChapters(this._tasks[this.page].serverId, this._tasks[this.page].project.Id, {chapters: chapters, role: this._selectedRoleIndex});
                    const serverStats = ScanProjectManager.Instance.DataCenter.GetServerStats(this._tasks[this.page].serverId);

                    if (serverStats && serverStats.Enabled[StatsType.ChapterDone])
                    {
                        serverStats.IncreaseChapterDone(this.Interaction.user.id, tasksDone);
                    }

                    if (chapters.length === this._chaptersForRole[this._selectedRoleIndex].length)
                    {
                        this._needToUpdateSelection = true;
                    }
                },
                getList: () => this._chaptersForRole[this._selectedRoleIndex],
                options:
                {
                    label: item => `Chapter ${item}`,
                    value: item => this._chaptersForRole[this._selectedRoleIndex].indexOf(item),
                },
                placeholder: "Mark done up to.."
            }
        ]);
        this.SetEphemeral(true);
    }

    ConstructEmbed()
    {
        const embed = EmbedUtility.GetNeutralEmbedMessage("Tasks");

        if (this._tasks.length === 0)
        {
            embed.setDescription("You have no tasks.");
            return embed;
        }

        // Check if the page is not out of bound
        if (this.page >= this._tasks.length)
        {
            this.page = 0;
        }

        /** @type {{serverId: string, project: Project, tasks: {task: Task, roleAvailable: number[]}[]}} */
        const task = this._tasks[this.page];
        const server = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(task.serverId);

        if (!server)
        {
            return embed.setDescription("This project server doesn't exist anymore or is not available.\n" +
                "Ask the bot creator to remove the project server from the database via support server available in /help command.");
        }

        embed.addFields([
            {name: "Name", value: `${task.project.Title} from ${server.name}`},
            {name: "Description", value: task.project.Description}
        ])

        if (task.project.Links.length > 0)
        {
            embed.addFields([
                {name: "Links", value: task.project.Links}
            ]);
        }

        if (task.project.ImageLink.startsWith("http"))
        {
            embed.setImage(task.project.ImageLink);
        }

        const tasks = [];
        this._chaptersForRole = {};

        for (let i = 0; i <= task.project.Roles.length; i++)
        {
            const chapters = [];

            for (const taskAndRole of task.tasks)
            {
                if (!taskAndRole.roleAvailable.includes(i)) continue;

                chapters.push(taskAndRole.task.Name);
            }

            if (chapters.length > 0)
            {
                let role = "";
                let prefix = "";

                if (i === task.project.Roles.length)
                {
                    role = "Publish";
                }
                else
                {
                    role = task.project.Roles[i].Name;
                }

                this._chaptersForRole[i] = chapters;

                if (this._needToUpdateSelection)
                {
                    this._selectedRoleIndex = i;
                    this._needToUpdateSelection = false;
                }

                if (i === this._selectedRoleIndex)
                {
                    prefix = EmojiUtility.GetEmoji(EmojiUtility.Emojis.Right);
                }


                tasks.push(`- ${prefix} **${role}**: Chapter ${chapters[0]}${chapters.length > 1 ? ` to ${chapters[chapters.length - 1]}` : ""}`);
            }
        }

        let found = false;

        for (let i = 0; i < Object.keys(this._chaptersForRole).length; i++)
        {
            if (this._selectedRoleIndex === parseInt(Object.keys(this._chaptersForRole)[i]))
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            this._selectedRoleIndex = parseInt(Object.keys(this._chaptersForRole)[0]);
        }

        embed.addFields([
            {name: "\u200B", value: "\u200B"},
            {name: "Tasks to do", value: tasks.join("\n")}
        ]);

        return embed;
    }

    ConstructComponents()
    {
        if (this._tasks.length === 0) return [];

        const components = [];

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`down`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Down))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._selectedRoleIndex === Object.keys(this._chaptersForRole).length - 1),
                new ButtonBuilder()
                    .setCustomId(`up`)
                    .setEmoji(EmojiUtility.GetEmojiData(EmojiUtility.Emojis.Up))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this._selectedRoleIndex === 0),
                new ButtonBuilder()
                    .setCustomId(`refresh`)
                    .setEmoji({name: "🔄"})
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        this.AddMenuComponents(components, 1);

        if (this._tasks.length > 1)
        {
            this.AddMenuComponents(components, 0);
            components.push(this.GetChangePageButtons());
        }

        return components;
    }

    async OnButton(interaction)
    {
        this.OnButtonChangePage(interaction, this._tasks.length, 0);

        if (interaction.customId === "down")
        {
            const currentIndex = Object.keys(this._chaptersForRole).indexOf(this._selectedRoleIndex.toString());
            this._selectedRoleIndex = parseInt(Object.keys(this._chaptersForRole)[currentIndex + 1]);
        }
        else if (interaction.customId === "up")
        {
            const currentIndex = Object.keys(this._chaptersForRole).indexOf(this._selectedRoleIndex.toString());
            this._selectedRoleIndex = parseInt(Object.keys(this._chaptersForRole)[currentIndex - 1]);
        }
    }

    async OnAction()
    {
        this._tasks = ScanProjectManager.Instance.DataCenter.GetProjectWithTasks(this.Interaction.user.id);
    }
}