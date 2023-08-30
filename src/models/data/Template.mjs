import {ProjectRole} from "./ProjectRole.mjs";

export class Template
{
    /** @type {string} */
    Name = ""
    /** @type {string} */
    Description = ""
    /** @type {ProjectRole[]} */
    Roles = []

    constructor()
    {
        this.Name = "Default template";
        this.Description = "A default template.";
        this.Roles =
        [
            new ProjectRole().FromJson({Name: "Clean", Users: [], Moving: 2}),
            new ProjectRole().FromJson({Name: "Translation", Users: []}),
            new ProjectRole().FromJson({Name: "Check", Users: []}),
            new ProjectRole().FromJson({Name: "Edit", Users: []}),
            new ProjectRole().FromJson({Name: "Quality check", Users: []})
        ];
    }

    FromJson(data)
    {
        this.Name = data.Name;
        this.Description = data.Description;
        this.Roles = [];

        for (const role of data.Roles)
        {
            this.Roles.push(new ProjectRole().FromJson(role));
        }

        return this;
    }

    GetSectionsAsFields(indexSelected = -1)
    {
        const sections = [];

        for (let role of this.Roles)
        {
            const index = this.Roles.indexOf(role);

            sections.push(role.GetSectionAsField(this.Roles, index === indexSelected));
        }

        if (sections.length === 0)
        {
            sections.push("No sections");
        }

        return {name: "Sections", value: sections.join("\n\n")};
    }
}