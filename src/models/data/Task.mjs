export class Task
{
    /** @type {string} */
    Name = ""
    /**
     * @brief List of booleans that represent the completion for each roles
     * @type {boolean[]} */
    Completion = []

    constructor()
    {
        this.Name = "";
        this.Completion = [];
    }

    FromJson(data)
    {
        this.Name = data.Name;
        this.Completion = data.Completion;

        return this;
    }

    InitializeCompletion(roles)
    {
        this.Completion = [];

        for (let role of roles)
        {
            this.Completion.push(false);
        }
    }

    IsAllCompleted()
    {
        for (let completion of this.Completion)
        {
            if (!completion) return false;
        }

        return true;
    }
}