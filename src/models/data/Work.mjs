export class Work
{
    /** @type {string} */
    ServerId = ""
    /** @type {string} */
    ProjectId = ""

    constructor()
    {
        this.ServerId = "";
        this.ProjectId = "";
    }

    FromJson(data)
    {
        this.ServerId = data.ServerId;
        this.ProjectId = data.ProjectId;

        return this;
    }
}