export class Task
{
    /** @type {string} */
    Name = ""
    /**
     * @brief Role index of the user who is working on this task and need to finish it
     * @type {number} */
    WorkIndex = 0

    constructor()
    {
        this.Name = "";
        this.WorkIndex = 0;
    }

    FromJson(data)
    {
        this.Name = data.Name;
        this.WorkIndex = data.WorkIndex;

        return this;
    }
}