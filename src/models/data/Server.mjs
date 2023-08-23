import {Template} from "./Template.mjs";
import {Project} from "./Project.mjs";

export class Server
{
    /** @type {Template[]} */
    Templates = []
    /** @type {Object<string, Project[]>} */
    Projects = {}

    constructor(data)
    {
        this.Templates = [];
        this.Projects = {};

        for (const template of data.Templates)
        {
            this.Templates.push(new Template(template));
        }

        for (const projectId of data.Projects)
        {
            this.Projects[projectId] = new Project(data.Projects[projectId]);
        }
    }
}