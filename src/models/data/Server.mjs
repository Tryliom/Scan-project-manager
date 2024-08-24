import {Template} from "./Template.mjs";
import {Project} from "./Project.mjs";
import {ServerStats} from "./ServerStats.mjs";

export class Server
{
    /** @type {Template[]} */
    Templates = []
    /** @type {Object<string, Project>} */
    Projects = {}
    /** @type {ServerStats} */
    Stats = new ServerStats()
    /** @type {string} */
    BotInformationChannelId = ""
    /**
     * @brief Whether the projects are visible to everyone or only the team.
     * @type {boolean} */
    Visibility = false

    constructor()
    {
        this.Templates = [];
        this.Projects = {};
        this.Stats = new ServerStats();
        this.BotInformationChannelId = "";
        this.Visibility = false;
    }

    FromJson(data)
    {
        this.Templates = [];
        this.Projects = {};
        if (data.Stats) this.Stats = new ServerStats().FromJson(data.Stats);
        if (data.BotInformationChannelId) this.BotInformationChannelId = data.BotInformationChannelId;

        for (const template of data.Templates)
        {
            this.Templates.push(new Template().FromJson(template));
        }

        for (const projectId in data.Projects)
        {
            data.Projects[projectId].Id = projectId;
            this.Projects[projectId] = new Project().FromJson(data.Projects[projectId]);
        }

        if (data.Visibility !== undefined) this.Visibility = data.Visibility;

        return this;
    }
}