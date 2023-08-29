import {Command} from "../Command.mjs";
import {CommandInterface} from "../../menus/CommandInterface.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";
import {EmbedUtility} from "../../utility/EmbedUtility.mjs";
import {EmojiUtility} from "../../utility/EmojiUtility.mjs";

export class Tasks extends Command
{
    constructor()
    {
        super("tasks", "", 0, "Show all your tasks.");
    }

    async Run(interaction)
    {
        await new TaskInterface(interaction).Start();
    }
}

class TaskInterface extends CommandInterface
{
    /** @type {{serverId: string, project: Project, tasks: Task[]}[]} */
    _tasks = [];
    /** @type {number} */
    page = 0;
    /** @type {number} */
    _selectedWorkIndex = 0;

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
                options: {
                    label: item => item.project.Title,
                    description: item => item.project.Description,
                    value: item => this._tasks.indexOf(item),
                    default: item => item.project.Id === this._tasks[this.page].project.Id
                },
                placeholder: "Select project.."
            },
            //TODO: Add a menu to select the chapters to mark as done
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

        /** @type {{serverId: string, project: Project, tasks: Task[]}} */
        const task = this._tasks[this.page];
        const server = ScanProjectManager.Instance.DiscordClient.guilds.cache.get(task.serverId);

        if (!server) return embed.setDescription("This project server doesn't exist anymore or is not available.");

        embed.addFields([
            {name: "Name", value: `${task.project.Title} from ${server.name}`},
            {name: "Description", value: task.project.Description}
        ])

        if (task.project.Links.length > 0)
        {
            embed.addFields({name: "Links", value: task.project.Links});
        }

        if (task.project.ImageLink.startsWith("http"))
        {
            embed.setImage(task.project.ImageLink);
        }

        // Sort tasks by the lowest work index
        const sortedTasks = task.tasks.sort((a, b) => a.WorkIndex - b.WorkIndex);
        const tasks = [];
        let index = 0;
        let chapters = [];
        const checkChapter = () =>
        {
            if (chapters.length > 0)
            {
                let role;
                let prefix;

                if (index === task.project.Roles.length)
                {
                    role = "Publish";
                }
                else
                {
                    role = task.project.Roles[index].Name;
                }

                if (tasks.length === this._selectedWorkIndex)
                {
                    prefix = EmojiUtility.GetEmoji(EmojiUtility.Emojis.Right);
                }

                tasks.push(`- ${prefix} **${role}**: Chapter ${chapters[0]}${chapters.length > 1 ? ` to ${chapters[chapters.length - 1]}` : ""}`);
            }
        };

        for (const task of sortedTasks)
        {
            if (index !== task.WorkIndex)
            {
                checkChapter();

                index = task.WorkIndex;
                chapters = [];
            }

            chapters.push(task.Name);
        }

        checkChapter();

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
    }

    OnAction()
    {
        this._tasks = ScanProjectManager.Instance.DataCenter.GetProjectWithTasks(this.Interaction.user.id);
    }
}