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

    constructor()
    {
        this.Templates = [];
        this.Projects = {};
        this.Stats = new ServerStats();
    }

    FromJson(data)
    {
        this.Templates = [];
        this.Projects = {};
        if (data.Stats) this.Stats = new ServerStats().FromJson(data.Stats);

        for (const template of data.Templates)
        {
            this.Templates.push(new Template().FromJson(template));
        }

        for (const projectId in data.Projects)
        {
            data.Projects[projectId].Id = projectId;
            this.Projects[projectId] = new Project().FromJson(data.Projects[projectId]);
        }

        return this;
    }
}