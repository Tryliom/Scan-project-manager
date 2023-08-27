import {Template} from "./Template.mjs";
import {Project} from "./Project.mjs";

export class Server
{
    /** @type {Template[]} */
    Templates = []
    /** @type {Object<string, Project>} */
    Projects = {}

    constructor()
    {
        this.Templates = [];
        this.Projects = {};
    }

    FromJson(data)
    {
        this.Templates = [];
        this.Projects = {};

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