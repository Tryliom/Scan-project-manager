export class Work
{
    /** @type {string} */
    ServerId = ""
    /** @type {string} */
    ProjectId = ""

    constructor(data)
    {
        this.ServerId = data.ServerId;
        this.ProjectId = data.ProjectId;
    }
}